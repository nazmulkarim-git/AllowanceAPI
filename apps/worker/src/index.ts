// apps/worker/src/index.ts

import {
  enforcePreflight,
  settlePostflight,
  checkCircuitBreakerPostflight,
  Policy,
} from "./policy";
import { UpstashRedis } from "./redis";
import { jsonError } from "./errors";

export default {
  async fetch(req: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const redis = new UpstashRedis(
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN
    );

    if (req.method !== "POST") {
      return jsonError(405, "method_not_allowed", "Only POST supported", env, requestId);
    }

    const body = await req.json();
    const model = body?.model ?? "unknown";

    const policy: Policy = {
      agentId: env.AGENT_ID,
      balanceCents: env.BALANCE_CENTS,
      velocityWindowSeconds: env.VELOCITY_WINDOW_SECONDS,
      velocityCents: env.VELOCITY_CENTS,
      circuitBreakerN: env.CIRCUIT_BREAKER_N,
    };

    // 🔹 PRE-FLIGHT (no breaker here)
    const pre = await enforcePreflight(
      redis,
      env.ALLOWANCE_KEY_PEPPER,
      policy,
      model,
      body
    );

    if (!pre.ok) {
      return jsonError(pre.status!, pre.code!, pre.message!, env, requestId);
    }

    // 🔹 Forward request upstream (mock or real)
    const upstream = await fetch(env.OPENAI_API_BASE + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const upstreamJson = await upstream.json();

    const tokens = upstreamJson?.usage?.total_tokens ?? 50;
    const actualCostCents = Math.ceil(tokens * 0.02);

    // 🔹 POST-FLIGHT settlement (THIS WAS MISSING BEFORE)
    await settlePostflight(
      redis,
      policy,
      pre.reserveCents!,
      actualCostCents
    );

    // 🔥 POST-FLIGHT circuit breaker (CORRECT LOCATION)
    const tripped = await checkCircuitBreakerPostflight(
      redis,
      policy,
      pre.promptHash!
    );

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
  },
};
