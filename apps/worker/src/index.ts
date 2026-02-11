// apps/worker/src/index.ts

import {
  enforcePreflight,
  settlePostflight,
  checkCircuitBreakerPostflight,
  Policy,
} from "./policy";

import { UpstashRedis } from "./redis";
import { jsonError } from "./errors";
import { SupabaseAdmin } from "./supabase";
import { sha256Hex, decryptAesGcmB64 } from "./crypto";
import { estimateCostCentsDbFirst } from "./pricing";
import { sendWebhook, TripEvent } from "./webhook";

function getBearer(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function err(status: number, code: string, message: string, requestId: string) {
  return jsonError(status, code, message, undefined, requestId);
}

function toTripEvent(code: string): TripEvent | null {
  switch (code) {
    case "velocity_cap_exceeded":
      return "velocity_cap_exceeded";
    case "insufficient_balance":
      return "insufficient_balance";
    case "model_not_allowed":
      return "model_not_allowed";
    case "key_frozen":
      return "key_frozen";
    case "circuit_breaker_tripped":
      return "circuit_breaker_tripped";
    default:
      return null;
  }
}

function fireWebhookBestEffort(
  ctx: ExecutionContext,
  agent: { id: string; webhook_url?: string | null; webhook_secret?: string | null },
  code: string,
  opts: { model?: string; reason?: string; requestId: string }
) {
  const event = toTripEvent(code);
  const webhookUrl = agent?.webhook_url;
  if (!event || !webhookUrl) return;

  ctx.waitUntil(
    sendWebhook({
      webhookUrl,
      webhookSecret: agent.webhook_secret,
      event,
      agentId: agent.id,
      model: opts.model,
      reason: opts.reason ?? code,
      requestId: opts.requestId,
      timestamp: new Date().toISOString(),
    })
  );
}

export default {
  async fetch(req: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();

    try {
      if (req.method !== "POST") {
        return err(405, "method_not_allowed", "Only POST supported", requestId);
      }

      const url = new URL(req.url);
      if (url.pathname !== "/v1/chat/completions") {
        return err(404, "not_found", "Unknown route", requestId);
      }
      
      const path = url.pathname;
      // Determine modality (kind) from OpenAI endpoint
      const kind =
        path.startsWith("/v1/images") ? "image" :
        path.startsWith("/v1/audio") ? "audio" :
        path.startsWith("/v1/embeddings") ? "embedding" :
        path.startsWith("/v1/realtime") ? "realtime" :
        "text";

      const allowKey = getBearer(req);
      if (!allowKey) {
        return err(401, "unauthorized", "Missing Authorization: Bearer sk_allow_...", requestId);
      }

      // Required env
      if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        return err(500, "server_misconfigured", "Missing Upstash Redis env", requestId);
      }
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return err(500, "server_misconfigured", "Missing Supabase env", requestId);
      }
      if (!env.ALLOWANCE_KEY_PEPPER) {
        return err(500, "server_misconfigured", "Missing ALLOWANCE_KEY_PEPPER", requestId);
      }
      if (!env.SERVER_ENCRYPTION_KEY_B64) {
        return err(500, "server_misconfigured", "Missing SERVER_ENCRYPTION_KEY_B64", requestId);
      }
      if (!env.OPENAI_API_BASE) {
        return err(500, "server_misconfigured", "Missing OPENAI_API_BASE", requestId);
      }

      // Parse body
      let body: any;
      try {
        body = await req.json();
      } catch {
        return err(400, "invalid_json", "Body must be valid JSON", requestId);
      }

      const requestedModel = body?.model;
      if (!requestedModel || typeof requestedModel !== "string") {
        return err(400, "missing_model", "Request body must include a model string", requestId);
      }

      const redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
      const supa = new SupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // 1) Resolve allowance key -> agent_id via key_hash
      const keyHash = await sha256Hex(`${env.ALLOWANCE_KEY_PEPPER}:${allowKey}`);
      const keyRec = await supa.getKeyRecordByHash(keyHash);
      if (!keyRec?.agent_id) {
        return err(401, "invalid_key", "Invalid or revoked allowance key", requestId);
      }

      // 2) Load agent policy (view: agents_with_policy)
      const agent = await supa.getAgentWithPolicy(keyRec.agent_id);
      if (!agent) {
        return err(404, "agent_not_found", "Agent not found", requestId);
      }
      if (agent.status && agent.status !== "active") {
        // optional webhook: agent disabled is not a "trip" event
        return err(403, "agent_disabled", "Agent is not active", requestId);
      }

      // Allowed model gating (after agent is confirmed)
      const allowed = agent.allowed_models;
      const allowedList: string[] =
        Array.isArray(allowed)
          ? allowed
          : typeof allowed === "string"
            ? allowed
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

      if (allowedList.length > 0 && requestedModel && !allowedList.includes(requestedModel)) {
        fireWebhookBestEffort(ctx, agent, "model_not_allowed", {
          model: requestedModel,
          reason: `Model not allowed: ${requestedModel}`,
          requestId,
        });
        return err(403, "model_not_allowed", `Model not allowed: ${requestedModel}`, requestId);
      }

      // Idempotency: if already processed, return cached response WITHOUT charging again
      const idem = req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");
      const idemKey = idem ? `allow:idem:${agent.id}:${idem}` : null;

      if (idemKey) {
        const existing = await redis.cmd<string | null>("GET", idemKey);
        if (existing) {
          return new Response(existing, { headers: { "content-type": "application/json" } });
        }
      }

      // 3) Build runtime policy used by policy.ts
      const policy: Policy = {
        agentId: agent.id,
        balanceCents: Number(agent.balance_cents ?? 0),
        velocityWindowSeconds: Number(agent.velocity_window_seconds ?? 60),
        velocityCents: Number(agent.velocity_cap_cents ?? 0),
        circuitBreakerN: Number(agent.circuit_breaker_n ?? 0),
      };

      // Track reservation so we can ALWAYS refund on unexpected errors
      let reserved = false;
      let reserveCents = 0;
      let settled = false;

      // 4) Preflight (ATOMIC reserve + velocity check)
      const pre = await enforcePreflight(
        redis,
        env.ALLOWANCE_KEY_PEPPER,
        supa,
        policy,
        requestedModel,
        body,
        {
          PRICING_JSON: env.PRICING_JSON,
          UNKNOWN_INPUT_PER_1M: env.UNKNOWN_INPUT_PER_1M,
          UNKNOWN_OUTPUT_PER_1M: env.UNKNOWN_OUTPUT_PER_1M,
        }
      );
      if (!pre.ok) {
        // fire webhook for trip errors
        fireWebhookBestEffort(ctx, agent, pre.code!, {
          model: requestedModel,
          reason: pre.message,
          requestId,
        });
        return err(pre.status!, pre.code!, pre.message!, requestId);
      }

      reserved = true;
      reserveCents = Number(pre.reserveCents || 0);

      try {
        // 5) Load encrypted provider key (provider=openai) for this user_id
        const q = new URLSearchParams({
          select: "encrypted_key",
          user_id: `eq.${agent.user_id}`,
          provider: "eq.openai",
          limit: "1",
        });

        const rows = await (async () => {
          const res = await fetch(`${env.SUPABASE_URL}/rest/v1/provider_keys?${q.toString()}`, {
            method: "GET",
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });

          const json = await res.json().catch(() => []);
          if (!res.ok) throw new Error(`Supabase error ${res.status}: ${JSON.stringify(json)}`);
          return json as any[];
        })();

        const encryptedKey = rows?.[0]?.encrypted_key;
        if (!encryptedKey) {
          // Refund reservation since we cannot proceed
          await settlePostflight(redis, policy, reserveCents, 0);
          settled = true;
          return err(401, "missing_provider_key", "No OpenAI key saved in Supabase for this user", requestId);
        }

        const openaiKey = await decryptAesGcmB64(encryptedKey, env.SERVER_ENCRYPTION_KEY_B64);

        // 6) Mock mode (no OpenAI call, but still tests enforcement)
        if (String(env.MOCK_OPENAI ?? "") === "1") {
          const promptTokens = 1;
          const completionTokens = 1;
          const actualCostCents = await estimateCostCentsDbFirst(
            supa,
            requestedModel,
            promptTokens,
            completionTokens,
            env
          );

          await settlePostflight(redis, policy, reserveCents, actualCostCents);
          settled = true;

          const tripped = await checkCircuitBreakerPostflight(redis, policy, pre.promptHash!);
          if (tripped) {
            fireWebhookBestEffort(ctx, agent, "circuit_breaker_tripped", {
              model: requestedModel,
              reason: "Circuit breaker tripped: repeated prompt loop detected.",
              requestId,
            });
            return err(429, "circuit_breaker_tripped", "Circuit breaker tripped: repeated prompt loop detected.", requestId);
          }

          const mock = {
            id: "mock-chatcmpl",
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: requestedModel,
            choices: [{ index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" }],
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens,
            },
          };

          if (idemKey) {
            await redis.cmd("SET", idemKey, JSON.stringify(mock));
            await redis.cmd("EXPIRE", idemKey, "86400");
          }

          return new Response(JSON.stringify(mock), { headers: { "content-type": "application/json" } });
        }

        // 7) Forward to OpenAI (REAL)
        const upstream = await fetch(env.OPENAI_API_BASE + "/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify(body),
        });

        const upstreamJson = await upstream.json().catch(() => ({
          error: { message: "Upstream returned non-JSON" },
        }));

        if (!upstream.ok) {
          // Refund reservation on upstream failure
          await settlePostflight(redis, policy, reserveCents, 0);
          settled = true;

          return new Response(JSON.stringify(upstreamJson), {
            status: upstream.status,
            headers: { "content-type": "application/json" },
          });
        }

        // 8) Compute actual cost from usage
        const usage = (upstreamJson as any)?.usage ?? {};
        const promptTokens = Number(usage.prompt_tokens ?? 0);
        const completionTokens = Number(usage.completion_tokens ?? 0);
        const actualCostCents = await estimateCostCentsDbFirst(
          supa,
          requestedModel,
          promptTokens,
          completionTokens,
          env
        );

        // 9) Postflight settlement + audit
        await settlePostflight(redis, policy, reserveCents, actualCostCents);
        settled = true;

        // Spend event + optional persist remaining balance to Supabase
        try {
          await supa.insertSpendEvent({
            agent_id: agent.id,
            user_id: agent.user_id,
            provider: "openai",
            model: requestedModel,
            kind,
            prompt_tokens: Math.max(0, Math.trunc(promptTokens)),
            completion_tokens: Math.max(0, Math.trunc(completionTokens)),
            cost_cents: Math.max(0, Math.trunc(actualCostCents)),
            request_id: requestId,
          });

          const newBalanceRaw = await redis.cmd<string | null>("GET", `allow:balance:${agent.id}`);
          if (newBalanceRaw) {
            const newBalance = Number(newBalanceRaw);
            if (Number.isFinite(newBalance)) {
              await supa.updateAgentPolicyBalance(agent.id, Math.trunc(newBalance));
            }
          }
        } catch (e) {
          console.log("SPEND_PERSIST_FAIL", String((e as any)?.message ?? e));
        }

        const tripped = await checkCircuitBreakerPostflight(redis, policy, pre.promptHash!);
        if (tripped) {
          fireWebhookBestEffort(ctx, agent, "circuit_breaker_tripped", {
            model: requestedModel,
            reason: "Circuit breaker tripped: repeated prompt loop detected.",
            requestId,
          });
          return err(429, "circuit_breaker_tripped", "Circuit breaker tripped: repeated prompt loop detected.", requestId);
        }

        // Cache successful response for idempotency AFTER settlement
        if (idemKey) {
          await redis.cmd("SET", idemKey, JSON.stringify(upstreamJson));
          await redis.cmd("EXPIRE", idemKey, "86400");
        }

        return new Response(JSON.stringify(upstreamJson), {
          headers: { "content-type": "application/json" },
        });
      } finally {
        // If anything threw after preflight but before settlement, refund reservation.
        if (reserved && !settled) {
          try {
            await settlePostflight(redis, policy, reserveCents, 0);
          } catch (e) {
            console.log("SETTLE_FAIL", String((e as any)?.message ?? e));
          }
        }
      }
    } catch (e: any) {
      return err(500, "internal_error", String(e?.message ?? e), requestId);
    }
  },
};
