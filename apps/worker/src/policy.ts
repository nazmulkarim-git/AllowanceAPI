import { UpstashRedis } from "./redis";
import { approxTokens, clampInt, hmacSha256Hex, normalizePrompt, nowMs } from "./crypto";
import { estimateCostCents } from "./pricing";

export type Policy = {
  agentId: string;
  userId: string;
  status: "active" | "frozen";
  balanceCents: number;
  allowedModels: string[];
  circuitBreakerN: number;
  velocityWindowSeconds: number;
  velocityCapCents: number;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
};

export type EnforcementResult =
  | { ok: true; reserveCents: number; promptHash: string }
  | { ok: false; status: number; code: string; message: string; tripEvent: string };

const KEY_PREFIX = "allow:";

export async function getCachedPolicy(redis: UpstashRedis, keyHash: string): Promise<Policy | null> {
  const json = await redis.cmd<string | null>("GET", `${KEY_PREFIX}policy:${keyHash}`);
  if (!json) return null;
  try { return JSON.parse(json) as Policy; } catch { return null; }
}

export async function cachePolicy(redis: UpstashRedis, keyHash: string, policy: Policy, ttlSeconds = 60): Promise<void> {
  await redis.cmd("SETEX", `${KEY_PREFIX}policy:${keyHash}`, String(ttlSeconds), JSON.stringify(policy));
}

export async function cacheKeyToAgent(redis: UpstashRedis, keyHash: string, agentId: string, ttlSeconds = 300): Promise<void> {
  await redis.cmd("SETEX", `${KEY_PREFIX}key_agent:${keyHash}`, String(ttlSeconds), agentId);
}

export async function getCachedAgentId(redis: UpstashRedis, keyHash: string): Promise<string | null> {
  return await redis.cmd<string | null>("GET", `${KEY_PREFIX}key_agent:${keyHash}`);
}

export async function enforcePreflight(
  redis: UpstashRedis,
  pepper: string,
  policy: Policy,
  model: string,
  requestBody: any
): Promise<EnforcementResult> {
  if (policy.status !== "active") {
    return { ok: false, status: 403, code: "key_frozen", message: "This allowance key is frozen.", tripEvent: "key_frozen" };
  }

  // Intent-based spending: model gate
  if (policy.allowedModels?.length) {
    const allowed = policy.allowedModels.includes(model);
    if (!allowed) {
      return { ok: false, status: 403, code: "model_not_allowed", message: `Model '${model}' is not allowed for this key.`, tripEvent: "model_not_allowed" };
    }
  }

  // Circuit breaker: prompt hash repeats
  const promptNorm = normalizePrompt(requestBody?.messages ?? requestBody?.input ?? requestBody?.prompt ?? requestBody);
  const promptHash = await hmacSha256Hex(pepper, `${model}:${promptNorm}`);
  const cbN = clampInt(policy.circuitBreakerN || 10, 2, 100);

  const lastHashKey = `${KEY_PREFIX}cb_last:${policy.agentId}`;
  const streakKey = `${KEY_PREFIX}cb_streak:${policy.agentId}`;

  const lastHash = await redis.cmd<string | null>("GET", lastHashKey);
  if (lastHash === promptHash) {
    const streak = await redis.cmd<number>("INCR", streakKey);
    await redis.cmd("EXPIRE", streakKey, "3600");
    if (streak >= cbN) {
      // Freeze the key in Redis immediately; dashboard can unfreeze by updating policy
      await redis.cmd("SET", `${KEY_PREFIX}frozen:${policy.agentId}`, "1");
      await redis.cmd("EXPIRE", `${KEY_PREFIX}frozen:${policy.agentId}`, "86400");
      return { ok: false, status: 429, code: "circuit_breaker_tripped", message: "Circuit breaker tripped: repeated prompt loop detected.", tripEvent: "circuit_breaker_tripped" };
    }
  } else {
    await redis.cmd("SETEX", lastHashKey, "3600", promptHash);
    await redis.cmd("SET", streakKey, "1");
    await redis.cmd("EXPIRE", streakKey, "3600");
  }

  // Balance check with conservative reserve
  const maxOut = Number(requestBody?.max_output_tokens ?? requestBody?.max_tokens ?? 1024);
  const approxPromptTokens = approxTokens(promptNorm);
  const reservePromptTokens = clampInt(approxPromptTokens, 1, 200000);
  const reserveCompletionTokens = clampInt(maxOut, 1, 200000);
  const reserveCents = estimateCostCents(model, reservePromptTokens, reserveCompletionTokens);

  if (policy.balanceCents <= 0 || policy.balanceCents < reserveCents) {
    return { ok: false, status: 402, code: "insufficient_balance", message: "Insufficient allowance balance.", tripEvent: "insufficient_balance" };
  }

  // Velocity cap (rolling window) using sorted set of events (ts -> cents)
  const winSec = clampInt(policy.velocityWindowSeconds || 3600, 10, 24 * 3600);
  const capCents = clampInt(policy.velocityCapCents || 50, 1, 1_000_000);

  const now = nowMs();
  const zkey = `${KEY_PREFIX}vel:${policy.agentId}`;
  const cutoff = now - winSec * 1000;

  // prune old
  await redis.cmd("ZREMRANGEBYSCORE", zkey, "0", String(cutoff));

  // sum recent costs (approx; uses stored cents as score member payload)
  const members = await redis.cmd<string[]>("ZRANGE", zkey, "0", "-1");
  let sum = 0;
  for (const m of members) {
    const parts = m.split(":");
    const cents = Number(parts[1] || 0);
    sum += cents;
  }
  if (sum + reserveCents > capCents) {
    return { ok: false, status: 429, code: "velocity_cap_exceeded", message: "Velocity cap exceeded. Please slow down.", tripEvent: "velocity_cap_exceeded" };
  }

  // Reserve: record a reservation event so bursts are throttled pre-call
  const reservationId = crypto.randomUUID();
  await redis.cmd("ZADD", zkey, String(now), `${reservationId}:${reserveCents}`);
  await redis.cmd("EXPIRE", zkey, String(winSec + 60));

  // also reserve balance (optimistic) so concurrent requests don't overspend
  const balKey = `${KEY_PREFIX}bal:${policy.agentId}`;
  const currentBal = await redis.cmd<string | null>("GET", balKey);
  const bal = currentBal ? Number(currentBal) : policy.balanceCents;
  const newBal = bal - reserveCents;
  if (newBal < 0) {
    // rollback reservation
    await redis.cmd("ZREM", zkey, `${reservationId}:${reserveCents}`);
    return { ok: false, status: 402, code: "insufficient_balance", message: "Insufficient allowance balance.", tripEvent: "insufficient_balance" };
  }
  await redis.cmd("SET", balKey, String(newBal));
  await redis.cmd("EXPIRE", balKey, "86400");

  return { ok: true, reserveCents, promptHash };
}

export async function settlePostflight(
  redis: UpstashRedis,
  policy: Policy,
  reserveCents: number,
  actualCostCents: number
): Promise<{ finalBalanceCents: number }> {
  const balKey = `allow:bal:${policy.agentId}`;
  const currentBal = await redis.cmd<string | null>("GET", balKey);
  const bal = currentBal ? Number(currentBal) : policy.balanceCents;

  // We already subtracted reserve preflight.
  // If actual < reserve -> refund. If actual > reserve -> subtract the difference (may go negative; then freeze).
  const delta = reserveCents - actualCostCents; // refund if positive
  let finalBal = bal + delta;
  await redis.cmd("SET", balKey, String(finalBal));
  await redis.cmd("EXPIRE", balKey, "86400");

  if (finalBal < 0) {
    // Freeze agent (soft) - dashboard can replenish
    await redis.cmd("SET", `allow:frozen:${policy.agentId}`, "1");
    await redis.cmd("EXPIRE", `allow:frozen:${policy.agentId}`, "86400");
    finalBal = 0;
    await redis.cmd("SET", balKey, "0");
  }

  return { finalBalanceCents: Math.max(0, Math.floor(finalBal)) };
}
