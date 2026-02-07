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

/**
 * Runtime validation + normalization.
 * Prevents Redis keys like allow:velocity:undefined and TTL "undefined".
 */
function normalizePolicy(policy: Policy) {
  const agentId = (policy?.agentId ?? "").trim();
  if (!agentId) {
    throw new Error("Policy misconfigured: agentId is missing");
  }

  const balanceCents = Math.trunc(Number(policy.balanceCents));
  if (!Number.isFinite(balanceCents) || balanceCents < 0) {
    throw new Error("Policy misconfigured: balanceCents invalid");
  }

  // Default window to 60s if missing; clamp to >= 1
  const velocityWindowSeconds = Math.max(
    1,
    Math.trunc(Number((policy as any).velocityWindowSeconds ?? 60))
  );
  if (!Number.isFinite(velocityWindowSeconds)) {
    throw new Error("Policy misconfigured: velocityWindowSeconds invalid");
  }

  const velocityCents = Math.trunc(Number(policy.velocityCents));
  if (!Number.isFinite(velocityCents) || velocityCents < 0) {
    throw new Error("Policy misconfigured: velocityCents invalid");
  }

  const circuitBreakerN = Math.trunc(Number(policy.circuitBreakerN));
  const cb = Number.isFinite(circuitBreakerN) ? circuitBreakerN : 0;

  return {
    ...policy,
    agentId,
    balanceCents,
    velocityWindowSeconds,
    velocityCents,
    circuitBreakerN: cb,
  };
}

function toInt(n: unknown, fallback = 0) {
  const x = Math.trunc(Number(n));
  return Number.isFinite(x) ? x : fallback;
}

async function getInt(redis: UpstashRedis, key: string): Promise<number | null> {
  const raw = await redis.cmd<string | null>("GET", key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

async function setInt(redis: UpstashRedis, key: string, value: number) {
  await redis.cmd("SET", key, String(Math.trunc(value)));
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
  const p = normalizePolicy(policy);

  // 1️⃣ Hard stop if agent already frozen
  const frozen = await redis.cmd<string>("GET", `${KEY_PREFIX}frozen:${p.agentId}`);
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

  // Reserve must be an integer number of cents
  const reserveCents = Math.max(1, Math.trunc(Math.ceil(tokens * 0.02)));

  const balanceKey = `${KEY_PREFIX}balance:${policy.agentId}`;
  const velocityKey = `${KEY_PREFIX}velocity:${policy.agentId}`;

  // Load balance from Redis; if missing, initialize from policy.balanceCents (DB default)
  let balance = await getInt(redis, balanceKey);
  if (balance === null) {
    balance = Math.trunc(policy.balanceCents);
    await setInt(redis, balanceKey, balance);
  }

  // Load velocity; if missing treat as 0
  let velocity = await getInt(redis, velocityKey);
  if (velocity === null) velocity = 0;

  if (balance < reserveCents) {
    return {
      ok: false,
      status: 402,
      code: "insufficient_balance",
      message: "Agent balance exceeded.",
    };
  }

  // Enforce velocity cap if configured (>0)
  if (policy.velocityCents > 0 && (velocity + reserveCents) > policy.velocityCents) {
    return {
      ok: false,
      status: 429,
      code: "velocity_exceeded",
      message: "Velocity limit exceeded. Please wait for the window to reset.",
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
  const p = normalizePolicy(policy);

  if (!p.circuitBreakerN || p.circuitBreakerN <= 0) return false;

  const key = `${KEY_PREFIX}prompt_streak:${p.agentId}:${promptHash}`;

  // INCR returns integer
  const streak = await redis.cmd<number>("INCR", key);

  // decay loop memory (integer seconds)
  const ttl = Math.max(60, p.velocityWindowSeconds);
  await redis.cmd("EXPIRE", key, String(ttl));

  if (streak >= p.circuitBreakerN) {
    await redis.cmd("SET", `${KEY_PREFIX}frozen:${p.agentId}`, "1");
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
  const p = normalizePolicy(policy);

  // We keep your original behavior: charge actualCents.
  // If you later implement true reservation hold/settlement, you can use delta.
  // const delta = actualCents - reservedCents;

  const balanceKey = `${KEY_PREFIX}balance:${p.agentId}`;

  // Read balance safely
  const raw = await redis.cmd<string | null>("GET", balanceKey);
  let balance = raw === null ? p.balanceCents : toInt(raw, p.balanceCents);

  // Repair corrupted stored value
  if (!Number.isFinite(balance) || !Number.isInteger(balance) || balance < 0) {
    balance = p.balanceCents;
  }

  // Charge actual (integer cents)
  const charge = Math.max(0, toInt(actualCents, 0));
  balance = balance - charge;

  // Never store non-integers
  await redis.cmd("SET", balanceKey, String(balance));

  // Velocity tracking
  const velocityKey = `${KEY_PREFIX}velocity:${p.agentId}`;

  // Ensure velocity is integer before INCRBY (self-heal corrupted key)
  const vraw = await redis.cmd<string | null>("GET", velocityKey);
  if (vraw !== null) {
    const v = Number(vraw);
    if (!Number.isFinite(v) || !Number.isInteger(v)) {
      await redis.cmd("SET", velocityKey, "0");
    }
  }

  const before = await redis.cmd<string | null>("GET", velocityKey);
  await redis.cmd("INCRBY", velocityKey, String(charge));
  if (before === null) {
    await redis.cmd("EXPIRE", velocityKey, String(windowSeconds));
  }

  return { finalBalanceCents: balance };
}
