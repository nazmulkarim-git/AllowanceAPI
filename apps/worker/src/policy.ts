// apps/worker/src/policy.ts

import { UpstashRedis } from "./redis";
import { hmacSha256Hex } from "./crypto";

export const KEY_PREFIX = "allow:";

export interface Policy {
  agentId: string;
  balanceCents: number;
  velocityWindowSeconds: number;
  velocityCents: number;
  circuitBreakerN: number;
}

export async function enforcePreflight(
  redis: UpstashRedis,
  pepper: string,
  policy: Policy,
  model: string,
  body: any
): Promise<{
  ok: boolean;
  reserveCents?: number;
  promptHash?: string;
  status?: number;
  code?: string;
  message?: string;
}> {
  // 1️⃣ Hard stop if agent already frozen
  const frozen = await redis.cmd<string>(
    "GET",
    `${KEY_PREFIX}frozen:${policy.agentId}`
  );
  if (frozen) {
    return {
      ok: false,
      status: 403,
      code: "key_frozen",
      message: "This allowance key is frozen.",
    };
  }

  // 2️⃣ Estimate cost (simple heuristic)
  const prompt = JSON.stringify(body?.messages ?? []);
  const tokens = Math.max(1, Math.ceil(prompt.length / 4));
  const reserveCents = Math.ceil(tokens * 0.02);

  if (policy.balanceCents < reserveCents) {
    return {
      ok: false,
      status: 402,
      code: "insufficient_balance",
      message: "Agent balance exceeded.",
    };
  }

  // 3️⃣ Compute prompt hash (USED LATER, NOT ENFORCED HERE)
  const promptHash = hmacSha256Hex(pepper, prompt);

  return {
    ok: true,
    reserveCents,
    promptHash,
  };
}

/**
 * POSTFLIGHT circuit breaker
 * Runs ONLY after usage + velocity are recorded
 */
export async function checkCircuitBreakerPostflight(
  redis: UpstashRedis,
  policy: Policy,
  promptHash: string
): Promise<boolean> {
  if (!policy.circuitBreakerN || policy.circuitBreakerN <= 0) return false;

  const key = `${KEY_PREFIX}prompt_streak:${policy.agentId}:${promptHash}`;
  const streak = await redis.cmd<number>("INCR", key);

  // decay loop memory
  await redis.cmd(
    "EXPIRE",
    key,
    String(Math.max(60, policy.velocityWindowSeconds))
  );

  if (streak >= policy.circuitBreakerN) {
    await redis.cmd("SET", `${KEY_PREFIX}frozen:${policy.agentId}`, "1");
    return true;
  }

  return false;
}

export async function settlePostflight(
  redis: UpstashRedis,
  policy: Policy,
  reservedCents: number,
  actualCents: number
): Promise<{ finalBalanceCents: number }> {
  const delta = actualCents - reservedCents;

  const balanceKey = `${KEY_PREFIX}balance:${policy.agentId}`;
  let balance = await redis.cmd<number>("GET", balanceKey);
  if (balance === null) balance = policy.balanceCents;

  balance -= actualCents;
  await redis.cmd("SET", balanceKey, String(balance));

  const velocityKey = `${KEY_PREFIX}velocity:${policy.agentId}`;
  await redis.cmd("INCRBY", velocityKey, actualCents);
  await redis.cmd(
    "EXPIRE",
    velocityKey,
    String(policy.velocityWindowSeconds)
  );

  return { finalBalanceCents: balance };
}
