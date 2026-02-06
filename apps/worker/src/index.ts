import { Router } from "itty-router";
import { UpstashRedis } from "./redis";
import { SupabaseAdmin } from "./supabase";
import { decryptAesGcmB64, sha256Hex } from "./crypto";
import { estimateCostCents } from "./pricing";
import { sendWebhook } from "./webhook";
import { cacheKeyToAgent, cachePolicy, enforcePreflight, getCachedAgentId, getCachedPolicy, settlePostflight, Policy } from "./policy";

type Env = {
  OPENAI_API_BASE: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  SERVER_ENCRYPTION_KEY_B64: string;
  ALLOWANCE_KEY_PEPPER: string;
  LOG_REQUESTS?: string;
};

const router = Router();

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const allowanceKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!allowanceKey) return null;

  return allowanceKey;
}

async function readJsonSafe(req: Request): Promise<any> {
  const text = await req.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }

function getIdempotencyKey(req: Request): string | null {
  return req.headers.get("Idempotency-Key") || req.headers.get("x-idempotency-key");
}

type CachedResponse = { status: number; headers: Record<string,string>; body: string };

async function idempotencyCheck(redis: any, agentId: string, idemKey: string): Promise<{hit: true; cached: CachedResponse} | {hit: false} | {hit: true; inProgress: true}> {
  const key = `allow:idem:${agentId}:${idemKey}`;
  const val = await redis.cmd<string | null>("GET", key);
  if (!val) {
    // mark in progress for 2 minutes
    await redis.cmd("SETEX", key, "120", JSON.stringify({ inProgress: true }));
    return { hit: false };
  }
  try {
    const parsed = JSON.parse(val);
    if (parsed?.inProgress) return { hit: true, inProgress: true } as any;
    return { hit: true, cached: parsed } as any;
  } catch {
    return { hit: true, inProgress: true } as any;
  }
}

async function idempotencyStore(redis: any, agentId: string, idemKey: string, cached: CachedResponse): Promise<void> {
  const key = `allow:idem:${agentId}:${idemKey}`;
  // keep for 24h
  await redis.cmd("SETEX", key, String(24*3600), JSON.stringify(cached));
}

async function idempotencyClearInProgress(redis: any, agentId: string, idemKey: string): Promise<void> {
  const key = `allow:idem:${agentId}:${idemKey}`;
  await redis.cmd("DEL", key);
}

type StreamUsage = { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };

function sseProxyAndCaptureUsage(upstreamBody: ReadableStream<Uint8Array>): { stream: ReadableStream<Uint8Array>; usagePromise: Promise<StreamUsage | null> } {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const ts = new TransformStream<Uint8Array, Uint8Array>();
  const reader = upstreamBody.getReader();
  const writer = ts.writable.getWriter();

  let buffer = "";
  let usage: StreamUsage | null = null;

  const usagePromise = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE events (split by double newline)
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // Pass-through immediately
          await writer.write(encoder.encode(chunk + "\n\n"));

          // Look for "data: {json}" lines
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              const u = j?.usage;
              if (u) usage = u;
            } catch {}
          }
        }
      }
    } finally {
      // Flush any remaining buffer
      if (buffer) await writer.write(encoder.encode(buffer));
      await writer.close();
    }
    return usage;
  })();

  return { stream: ts.readable, usagePromise };
}

}

router.get("/healthz", () => new Response("ok"));

router.all("*", async (req: Request, env: Env, ctx: ExecutionContext) => {
  const allowanceKey = getBearerToken(req);
  if (!allowanceKey) return jsonError(401, "missing_key", "Missing Bearer allowance key.");
  console.log("auth_present", !!(req.headers.get("authorization") || req.headers.get("Authorization")));
  console.log("debug_request_id", req.headers.get("x-debug-request-id"));
  console.log("allowanceKey_type", typeof allowanceKey);
  console.log("allowanceKey_prefix", (allowanceKey || "").slice(0, 12));

  // Hash the allowance key (never store raw key)
  const keyHash = await sha256Hex(`${env.ALLOWANCE_KEY_PEPPER}:${allowanceKey}`);
  console.log("keyHash", keyHash);
  console.log("pepper_prefix", (env.ALLOWANCE_KEY_PEPPER || "").slice(0, 6));

  const redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  const supa = new SupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Resolve agent id from cache or DB
  let agentId = await getCachedAgentId(redis, keyHash);
  if (!agentId) {
    const rec = await supa.getKeyRecordByHash(keyHash);
    if (!rec || rec.revoked_at) return jsonError(403, "invalid_key", "Invalid or revoked allowance key.");
    agentId = rec.agent_id;
    await cacheKeyToAgent(redis, keyHash, agentId, 300);
  }

  // Fetch policy (cache first)
  let policy = await getCachedPolicy(redis, keyHash);
  if (!policy) {
    const row = await supa.getAgentWithPolicy(agentId);
    if (!row) return jsonError(403, "invalid_agent", "Agent not found.");
    // respect redis freeze flag immediately
    const frozen = await redis.cmd<string | null>("GET", `allow:frozen:${row.id}`);
    const status = frozen ? "frozen" : (row.status as any);

    policy = {
      agentId: row.id,
      userId: row.user_id,
      status,
      balanceCents: Number(row.balance_cents ?? 0),
      allowedModels: row.allowed_models ?? [],
      circuitBreakerN: Number(row.circuit_breaker_n ?? 10),
      velocityWindowSeconds: Number(row.velocity_window_seconds ?? 3600),
      velocityCapCents: Number(row.velocity_cap_cents ?? 50),
      webhookUrl: (row as any).webhook_url ?? null,
      webhookSecret: (row as any).webhook_secret ?? null,
    } satisfies Policy;

    // ensure balance cached
    await redis.cmd("SETEX", `allow:bal:${policy.agentId}`, "86400", String(policy.balanceCents));
    await cachePolicy(redis, keyHash, policy, 60);
  }

  // Read request body for enforcement + forwarding
  const url = new URL(req.url);
  const path = url.pathname;

  const body = await readJsonSafe(req);
  const model = body?.model ?? "gpt-4o-mini";
  const wantsStream = !!body?.stream;
  if (wantsStream) {
    body.stream_options = { ...(body.stream_options || {}), include_usage: true };
  }

  // Preflight policy checks
  const pre = await enforcePreflight(redis, env.ALLOWANCE_KEY_PEPPER, policy, model, body);
  if (!pre.ok) return jsonError(pre.status, pre.code, pre.message);

  // Get user's master provider key from Supabase
  const encryptedKey = await supa.getEncryptedProviderKey(policy.userId);
  if (!encryptedKey) return jsonError(400, "missing_provider_key", "User has not configured a provider key in the dashboard.");
  let masterKey: string;
  try {
    masterKey = await decryptAesGcmB64(encryptedKey, env.SERVER_ENCRYPTION_KEY_B64);
  } catch {
    return jsonError(500, "decrypt_failed", "Failed to decrypt provider key.");
  }

  // Forward to OpenAI (OpenAI-compatible proxy)
  const forwardUrl = `${env.OPENAI_API_BASE}${path}${url.search}`;
  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${masterKey}`);
  headers.delete("host");
  headers.delete("cf-connecting-ip");

  if (env.LOG_REQUESTS === "1") {
    console.log("proxy", { path, model, agentId: policy.agentId });
  }

  const upstream = await fetch(forwardUrl, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(body),
  });

  // STREAMING: proxy SSE while capturing usage if included.
  if (wantsStream && upstream.body) {
    const { stream, usagePromise } = sseProxyAndCaptureUsage(upstream.body);

    // After stream ends, settle + persist
    ctx.waitUntil((async () => {
      const usage = await usagePromise;
      let promptTokens = 0, completionTokens = 0, actualCostCents = pre.reserveCents;
      if (usage) {
        promptTokens = Number((usage as any).prompt_tokens ?? (usage as any).input_tokens ?? 0);
        completionTokens = Number((usage as any).completion_tokens ?? (usage as any).output_tokens ?? 0);
        if (promptTokens || completionTokens) actualCostCents = estimateCostCents(model, promptTokens, completionTokens);
      }
      const settled = await settlePostflight(redis, policy, pre.reserveCents, actualCostCents);

      try {
        await supa.insertSpendEvent({
          agent_id: policy.agentId,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          cost_cents: actualCostCents,
          request_id: upstream.headers.get("x-request-id") ?? undefined,
        });
        await supa.updateAgentPolicyBalance(policy.agentId, settled.finalBalanceCents);
      } catch (e) {
        console.log("persist_failed", String(e));
      }

      // clear idempotency in-progress marker for streaming (no caching)
      const idemKey = getIdempotencyKey(req);
      if (idemKey) await idempotencyClearInProgress(redis, policy.agentId, idemKey);
    })());

    const outHeaders = new Headers(upstream.headers);
    outHeaders.set("X-Allowance-Agent-Id", policy.agentId);
    outHeaders.set("X-Allowance-Reserved-Cents", String(pre.reserveCents));

    return new Response(stream, { status: upstream.status, headers: outHeaders });
  }

  // NON-STREAM: read full body for usage and optional idempotency caching
  const text = await upstream.text();

  // Attempt to parse usage for cost
  let promptTokens = 0, completionTokens = 0, actualCostCents = pre.reserveCents;
  try {
    const json = JSON.parse(text);
    const usage = json?.usage;
    promptTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens ?? 0);
    completionTokens = Number(usage?.completion_tokens ?? usage?.output_tokens ?? 0);
    if (promptTokens || completionTokens) actualCostCents = estimateCostCents(model, promptTokens, completionTokens);
  } catch {
    // non-json response; keep reserve
  }

  // Settle balance
  const settled = await settlePostflight(redis, policy, pre.reserveCents, actualCostCents);

  // Persist to Supabase
  try {
    await supa.insertSpendEvent({
      agent_id: policy.agentId,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost_cents: actualCostCents,
      request_id: upstream.headers.get("x-request-id") ?? undefined,
    });
    await supa.updateAgentPolicyBalance(policy.agentId, settled.finalBalanceCents);
  } catch (e) {
    console.log("persist_failed", String(e));
  }

  // Return upstream response (pass-through) with allowance headers
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set("X-Allowance-Agent-Id", policy.agentId);
  outHeaders.set("X-Allowance-Cost-Cents", String(actualCostCents));
  outHeaders.set("X-Allowance-Balance-Cents", String(settled.finalBalanceCents));

  // Store idempotent response (non-stream only)
  const idemKey = getIdempotencyKey(req);
  if (idemKey) {
    const cached: CachedResponse = {
      status: upstream.status,
      headers: {
        "Content-Type": outHeaders.get("Content-Type") || "application/json",
        "X-Allowance-Agent-Id": outHeaders.get("X-Allowance-Agent-Id") || "",
        "X-Allowance-Cost-Cents": outHeaders.get("X-Allowance-Cost-Cents") || "",
        "X-Allowance-Balance-Cents": outHeaders.get("X-Allowance-Balance-Cents") || "",
      },
      body: text,
    };
    await idempotencyStore(redis, policy.agentId, idemKey, cached);
  }

  return new Response(text, { status: upstream.status, headers: outHeaders });
});
export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    return router.fetch(req, env, ctx);
  },
};
