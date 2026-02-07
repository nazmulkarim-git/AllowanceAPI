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

function getBearer(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export default {
  async fetch(req: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();

    try {
      if (req.method !== "POST") {
        return jsonError(405, "method_not_allowed", "Only POST supported", env, requestId);
      }

      // Route guard (optional, but helps)
      const url = new URL(req.url);
      if (url.pathname !== "/v1/chat/completions") {
        return jsonError(404, "not_found", "Unknown route", env, requestId);
      }

      const allowKey = getBearer(req);
      if (!allowKey) {
        return jsonError(401, "unauthorized", "Missing Authorization: Bearer sk_allow_...", env, requestId);
      }

      // Required env
      if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        return jsonError(500, "server_misconfigured", "Missing Upstash Redis env", env, requestId);
      }
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return jsonError(500, "server_misconfigured", "Missing Supabase env", env, requestId);
      }
      if (!env.ALLOWANCE_KEY_PEPPER) {
        return jsonError(500, "server_misconfigured", "Missing ALLOWANCE_KEY_PEPPER", env, requestId);
      }
      if (!env.SERVER_ENCRYPTION_KEY_B64) {
        return jsonError(500, "server_misconfigured", "Missing SERVER_ENCRYPTION_KEY_B64", env, requestId);
      }
      if (!env.OPENAI_API_BASE) {
        return jsonError(500, "server_misconfigured", "Missing OPENAI_API_BASE", env, requestId);
      }

      // Parse body
      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonError(400, "invalid_json", "Body must be valid JSON", env, requestId);
      }
      const model = body?.model ?? "unknown";

      const redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
      const supa = new SupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // 1) Resolve allowance key -> agent_id via key_hash
      const keyHash = await sha256Hex(`${env.ALLOWANCE_KEY_PEPPER}:${allowKey}`);
      const keyRec = await supa.getKeyRecordByHash(keyHash);
      if (!keyRec?.agent_id) {
        return jsonError(401, "invalid_key", "Invalid or revoked allowance key", env, requestId);
      }

      // 2) Load agent policy (view: agents_with_policy)
      const agent = await supa.getAgentWithPolicy(keyRec.agent_id);
      const requestedModel = body?.model;
      const allowed = agent.allowed_models;

      // Handle both array + string formats
      const allowedList: string[] =
        Array.isArray(allowed) ? allowed :
        typeof allowed === "string" ? allowed.split(",").map(s => s.trim()).filter(Boolean) :
        [];

      if (allowedList.length > 0 && requestedModel && !allowedList.includes(requestedModel)) {
        return jsonError(403, "model_not_allowed", `Model not allowed: ${requestedModel}`);
      }
      if (!agent) {
        return jsonError(404, "agent_not_found", "Agent not found", env, requestId);
      }
      if (agent.status && agent.status !== "active") {
        return jsonError(403, "agent_disabled", "Agent is not active", env, requestId);
      }

      // 3) Build runtime policy used by policy.ts
      const policy: Policy = {
        agentId: agent.id, // IMPORTANT: never undefined now
        balanceCents: Number(agent.balance_cents ?? 0),
        velocityWindowSeconds: Number(agent.velocity_window_seconds ?? 60),
        velocityCents: Number(agent.velocity_cap_cents ?? 0),
        circuitBreakerN: Number(agent.circuit_breaker_n ?? 0),
      };

      // 4) Preflight
      const pre = await enforcePreflight(redis, env.ALLOWANCE_KEY_PEPPER, policy, model, body);
      if (!pre.ok) {
        return jsonError(pre.status!, pre.code!, pre.message!, env, requestId);
      }

      // 5) Load encrypted provider key (provider=openai) for this user_id
      // SupabaseAdmin.getEncryptedProviderKey() in your repo doesn't filter provider,
      // so we query directly with provider=openai to be correct.
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
        return jsonError(401, "missing_provider_key", "No OpenAI key saved in Supabase for this user", env, requestId);
      }

      const openaiKey = await decryptAesGcmB64(encryptedKey, env.SERVER_ENCRYPTION_KEY_B64);

      
      const idem = req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");
      if (idem) {
        const idemKey = `allow:idem:${agentId}:${idem}`;

        // If already processed, return cached response body (best practice),
        // or at least avoid charging again.
        const existing = await redis.cmd<string | null>("GET", idemKey);
        if (existing) {
          return new Response(existing, { headers: { "content-type": "application/json" } });
        }
      }
      
      // 6) OPTIONAL: Free mock mode (no OpenAI spend)
      if (String(env.MOCK_OPENAI ?? "") === "1") {
        const mock = {
          id: "mock-chatcmpl",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: body?.model ?? "mock-model",
          choices: [
            { index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        };

        // still settle + breaker so you can test all features without OpenAI
        await settlePostflight(redis, policy, pre.reserveCents!, 1);
        await checkCircuitBreakerPostflight(redis, policy, pre.promptHash!);

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

      if (idem) {
        const idemKey = `allow:idem:${agentId}:${idem}`;
        // cache for 24h
        await redis.cmd("SET", idemKey, JSON.stringify(upstreamJson));
        await redis.cmd("EXPIRE", idemKey, "86400");
      }

      if (!upstream.ok) {
        return new Response(JSON.stringify(upstreamJson), {
          status: upstream.status,
          headers: { "content-type": "application/json" },
        });
      }

      // 8) Compute actual cost (simple heuristic)
      const tokens = upstreamJson?.usage?.total_tokens ?? 50;
      const actualCostCents = Math.max(0, Math.trunc(Math.ceil(Number(tokens) * 0.02)));

      // 9) Postflight + breaker
      await settlePostflight(redis, policy, pre.reserveCents!, actualCostCents);
      // Record spend event + persist balance in Supabase (system of record)
      try {
        await supa.insertSpendEvent({
          agent_id: agent.id,
          user_id: agent.user_id,
          provider: "openai",
          model: body?.model ?? "unknown",
          cost_cents: actualCostCents,
          request_id: requestId,
        });

        // Optional: persist remaining balance if agents.balance_cents means “remaining”
        // We can recompute from Redis (source of enforcement).
        const newBalanceRaw = await redis.cmd<string | null>("GET", `allow:balance:${agent.id}`);
        if (newBalanceRaw) {
          const newBalance = Number(newBalanceRaw);
          if (Number.isFinite(newBalance)) {
            await supa.updateAgentPolicyBalance(agent.id, Math.trunc(newBalance));
          }
        }
      } catch (e) {
        // Don’t fail the request if audit write fails, but log it.
        console.log("SPEND_PERSIST_FAIL", String((e as any)?.message ?? e));
      }

      const tripped = await checkCircuitBreakerPostflight(redis, policy, pre.promptHash!);
      if (tripped) {
        return jsonError(
          429,
          "circuit_breaker_tripped",
          "Circuit breaker tripped: repeated prompt loop detected.",
          env,
          requestId
        );
      }

      return new Response(JSON.stringify(upstreamJson), {
        headers: { "content-type": "application/json" },
      });
    } catch (e: any) {
      // Never crash (no 1101)
      return jsonError(500, "internal_error", String(e?.message ?? e), env, requestId);
    }
  },
};
