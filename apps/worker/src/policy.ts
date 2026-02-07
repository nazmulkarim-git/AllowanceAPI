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
  if (!agentId) throw new Error("Policy misconfigured: agentId is missing");

  const balanceCents = Math.trunc(Number(policy.balanceCents));
  if (!Number.isFinite(balanceCents) || balanceCents < 0) {
    throw new Error("Policy misconfigured: balanceCents invalid");
  }

  const velocityWindowSeconds = Math.max(1, Math.trunc(Number(policy.velocityWindowSeconds ?? 60)));
  if (!Number.isFinite(velocityWindowSeconds)) {
    throw new Error("Policy misconfigured: velocityWindowSeconds invalid");
  }

  const velocityCents = Math.trunc(Number(policy.velocityCents ?? 0));
  if (!Number.isFinite(velocityCents) || velocityCents < 0) {
    throw new Error("Policy misconfigured: velocityCents invalid");
  }

  const circuitBreakerN = Math.trunc(Number(policy.circuitBreakerN ?? 0));
  const cb = Number.isFinite(circuitBreakerN) && circuitBreakerN > 0 ? circuitBreakerN : 0;

  return {
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

/**
 * Atomic reserve:
 * - Initialize balance if missing
 * - Ensure balance >= reserve
 * - Ensure velocity cap
 * - DECRBY balance by reserve
 * - INCRBY velocity by reserve and set TTL
 */
async function atomicReserve(
  redis: UpstashRedis,
  balanceKey: string,
  velocityKey: string,
  initialBalance: number,
  reserve: number,
  velocityCap: number,
  windowSeconds: number
): Promise<{ ok: true } | { ok: false; code: "insufficient_balance" | "velocity_exceeded" }> {
  const lua = `
local balKey = KEYS[1]
local velKey = KEYS[2]
local initBal = tonumber(ARGV[1])
local reserve = tonumber(ARGV[2])
local velCap = tonumber(ARGV[3])
local win = tonumber(ARGV[4])

local bal = redis.call("GET", balKey)
if not bal then
  redis.call("SET", balKey, initBal)
  bal = initBal
else
  bal = tonumber(bal) or initBal
end

if bal < reserve then
  return {"ERR","insufficient_balance"}
end

local vel = redis.call("GET", velKey)
if not vel then vel = 0 else vel = tonumber(vel) or 0 end

if velCap > 0 and (vel + reserve) > velCap then
  return {"ERR","velocity_exceeded"}
end

redis.call("DECRBY", balKey, reserve)
redis.call("INCRBY", velKey, reserve)

local ttl = redis.call("TTL", velKey)
if ttl < 0 then
  redis.call("EXPIRE", velKey, win)
end

return {"OK"}
  `;

  const res = await redis.cmd<any>(
    "EVAL",
    lua,
    "2",
    balanceKey,
    velocityKey,
    String(initialBalance),
    String(reserve),
    String(velocityCap),
    String(windowSeconds)
  );

  if (Array.isArray(res) && res[0] === "ERR") {
    return { ok: false, code: res[1] };
  }
  return { ok: true };
}

export async function enforcePreflight(
  redis: UpstashRedis,
  pepper: string,
  policy: Policy,
  _model: string,
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

  // Hard stop if agent already frozen
  const frozen = await redis.cmd<string | null>("GET", `${KEY_PREFIX}frozen:${p.agentId}`);
  if (frozen) {
    return {
      ok: false,
      status: 403,
      code: "key_frozen",
      message: "This allowance key is frozen.",
    };
  }

  // Estimate reserve (simple heuristic; final cost is settled postflight)
  const prompt = JSON.stringify(body?.messages ?? []);
  const tokens = Math.max(1, Math.ceil(prompt.length / 4));
  const reserveCents = Math.max(1, Math.trunc(Math.ceil(tokens * 0.02)));

  const promptHash = await hmacSha256Hex(pepper, prompt);

  const balanceKey = `${KEY_PREFIX}balance:${p.agentId}`;
  const velocityKey = `${KEY_PREFIX}velocity:${p.agentId}`;

  const reserved = await atomicReserve(
    redis,
    balanceKey,
    velocityKey,
    p.balanceCents,
    reserveCents,
    p.velocityCents,
    p.velocityWindowSeconds
  );

  if (!reserved.ok) {
    if (reserved.code === "insufficient_balance") {
      return { ok: false, status: 402, code: "insufficient_balance", message: "Agent balance exceeded." };
    }
    return {
      ok: false,
      status: 429,
      code: "velocity_exceeded",
      message: "Velocity limit exceeded. Please wait for the window to reset.",
    };
  }

  return { ok: true, reserveCents, promptHash };
}

/**
 * POSTFLIGHT circuit breaker
 * Runs ONLY after usage recorded
 */
export async function checkCircuitBreakerPostflight(
  redis: UpstashRedis,
  policy: Policy,
  promptHash: string
): Promise<boolean> {
  const p = normalizePolicy(policy);
  if (!p.circuitBreakerN || p.circuitBreakerN <= 0) return false;

  const key = `${KEY_PREFIX}prompt_streak:${p.agentId}:${promptHash}`;

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

/**
 * Settlement after response:
 * We already subtracted `reservedCents` in preflight.
 * So we apply delta:
 * - if actual < reserved => refund (reserved - actual)
 * - if actual > reserved => charge extra (actual - reserved)
 */
export async function settlePostflight(
  redis: UpstashRedis,
  policy: Policy,
  reservedCents: number,
  actualCents: number
): Promise<{ finalBalanceCents: number }> {
  const p = normalizePolicy(policy);

  const balanceKey = `${KEY_PREFIX}balance:${p.agentId}`;

  const raw = await redis.cmd<string | null>("GET", balanceKey);
  let balance = raw === null ? p.balanceCents : toInt(raw, p.balanceCents);

  const reserved = Math.max(0, toInt(reservedCents, 0));
  const actual = Math.max(0, toInt(actualCents, 0));

  const refund = reserved - actual; // positive => refund, negative => extra charge
  balance = balance + refund;

  await redis.cmd("SET", balanceKey, String(balance));
  return { finalBalanceCents: balance };
}
