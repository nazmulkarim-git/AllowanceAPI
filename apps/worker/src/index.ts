// apps/worker/src/index.ts

import {
  enforcePreflight,
  settlePostflight,
  checkCircuitBreakerPostflight,
  Policy,
} from "./policy";
import { UpstashRedis } from "./redis";
import { jsonError } from "./errors";

function toInt(v: any, fallback: number): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function requireBearer(req: Request): string {
  const auth = req.headers.get("Authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  if (!token) throw new Error("Missing Authorization: Bearer <allowance_key>");
  return token;
}

function agentIdFromAllowKey(allowKey: string): string {
  // Stable, non-secret identifier for Redis keys
  // (Do NOT store full key in Redis key names.)
  return allowKey.slice(-12);
}

export default {
  async fetch(req: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();

    try {
      // ✅ Basic config checks
      if (!env?.UPSTASH_REDIS_REST_URL || !env?.UPSTASH_REDIS_REST_TOKEN) {
        return jsonError(
          500,
          "server_misconfigured",
          "Missing Upstash Redis bindings (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
          env,
          requestId
        );
      }

      const redis = new UpstashRedis(
        env.UPSTASH_REDIS_REST_URL,
        env.UPSTASH_REDIS_REST_TOKEN
      );

      if (req.method !== "POST") {
        return jsonError(
          405,
          "method_not_allowed",
          "Only POST supported",
          env,
          requestId
        );
      }

      // ✅ Auth: derive agentId from the allowance key so it never becomes undefined
      let allowKey: string;
      try {
        allowKey = requireBearer(req);
      } catch (e: any) {
        return jsonError(401, "unauthorized", String(e?.message ?? e), env, requestId);
      }

      const agentId = agentIdFromAllowKey(allowKey);
      if (!agentId) {
        return jsonError(
          401,
          "unauthorized",
          "Invalid allowance key.",
          env,
          requestId
        );
      }

      // ✅ Parse body safely
      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonError(400, "invalid_json", "Request body must be valid JSON.", env, requestId);
      }

      const model = body?.model ?? "unknown";

      // ✅ Policy defaults (prevents undefined TTL / counters)
      const policy: Policy = {
        agentId,
        balanceCents: toInt(env.BALANCE_CENTS, 1000),                 // default $10.00 if cents
        velocityWindowSeconds: toInt(env.VELOCITY_WINDOW_SECONDS, 60),// default 60 seconds
        velocityCents: toInt(env.VELOCITY_CENTS, 500),                // default $5.00 window
        circuitBreakerN: toInt(env.CIRCUIT_BREAKER_N, 5),              // default 5 repeats
      };

      const pepper = (env.ALLOWANCE_KEY_PEPPER ?? "dev-pepper") as string;

      // 🔹 PRE-FLIGHT
      const pre = await enforcePreflight(redis, pepper, policy, model, body);

      if (!pre.ok) {
        return jsonError(pre.status!, pre.code!, pre.message!, env, requestId);
      }

      // 🔹 Forward request upstream
      if (!env?.OPENAI_API_BASE) {
        return jsonError(
          500,
          "server_misconfigured",
          "Missing OPENAI_API_BASE.",
          env,
          requestId
        );
      }

      const upstreamHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Optional: if you set OPENAI_API_KEY in Worker vars/secrets, it will authenticate upstream.
      if (env.OPENAI_API_KEY) {
        upstreamHeaders["Authorization"] = `Bearer ${env.OPENAI_API_KEY}`;
      }

      const upstream = await fetch(env.OPENAI_API_BASE + "/v1/chat/completions", {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify(body),
      });

      // If upstream returns non-JSON, avoid crashing
      let upstreamJson: any = null;
      try {
        upstreamJson = await upstream.json();
      } catch {
        upstreamJson = { error: "Upstream returned non-JSON response." };
      }

      if (!upstream.ok) {
        // pass upstream error through
        return new Response(JSON.stringify(upstreamJson), {
          status: upstream.status,
          headers: { "content-type": "application/json" },
        });
      }

      const tokens = upstreamJson?.usage?.total_tokens ?? 50;
      const actualCostCents = Math.max(0, Math.trunc(Math.ceil(Number(tokens) * 0.02)));

      // 🔹 POST-FLIGHT settlement
      await settlePostflight(redis, policy, pre.reserveCents!, actualCostCents);

      // 🔥 POST-FLIGHT circuit breaker
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
      // ✅ Never crash with 1101 again; always return JSON error
      return jsonError(
        500,
        "internal_error",
        String(e?.message ?? e),
        env,
        requestId
      );
    }
  },
};
