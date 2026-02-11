/**
 * Pricing table (USD per 1M tokens).
 * You can override at deploy-time using env PRICING_JSON:
 * {
 *   "gpt-4o-mini": {"inputPer1M": 0.15, "outputPer1M": 0.60},
 *   "gpt-4o": {"inputPer1M": 5.0, "outputPer1M": 15.0}
 * }
 */

import type { SupabaseAdmin } from "./supabase";

type EnvLike = {
  PRICING_JSON?: string;
  UNKNOWN_INPUT_PER_1M?: string;
  UNKNOWN_OUTPUT_PER_1M?: string;
};

type PriceEntry = {
  inputPer1M: number;
  outputPer1M: number;
};

export type ModelPrice = { inputPer1M: number; outputPer1M: number };

const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o": { inputPer1M: 5.0, outputPer1M: 15.0 },
};

let cachedPrices: Record<string, ModelPrice> | null = null;

export function loadPrices(env?: { PRICING_JSON?: string }): Record<string, ModelPrice> {
  if (cachedPrices !== null) return cachedPrices;

  if (env?.PRICING_JSON) {
    try {
      const parsed = JSON.parse(env.PRICING_JSON);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        cachedPrices = parsed as Record<string, ModelPrice>;
        return cachedPrices;
      }
    } catch {
      // fall back to defaultsS
    }
  }

  cachedPrices = DEFAULT_PRICES;
  return cachedPrices;
}

function unknownPrice(env?: EnvLike) {
  const inputPer1M = Number(env?.UNKNOWN_INPUT_PER_1M ?? "50");   // very safe
  const outputPer1M = Number(env?.UNKNOWN_OUTPUT_PER_1M ?? "250"); // very safe

  return { inputPer1M, outputPer1M };
}

export function estimateCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
  env?: { PRICING_JSON?: string; UNKNOWN_INPUT_PER_1M?: string; UNKNOWN_OUTPUT_PER_1M?: string }
): number {
  const PRICES = loadPrices(env);
  const p = PRICES[model];

  if (!p) {
    const u = unknownPrice(env);
    const cost =
      (promptTokens / 1_000_000) * u.inputPer1M +
      (completionTokens / 1_000_000) * u.outputPer1M;

    return Math.max(0, Math.ceil(cost * 100));
  }

  const cost =
    (promptTokens / 1_000_000) * p.inputPer1M +
    (completionTokens / 1_000_000) * p.outputPer1M;

  return Math.max(0, Math.ceil(cost * 100));
}


export async function estimateCostCentsDbFirst(
  supa: SupabaseAdmin,
  model: string,
  promptTokens: number,
  completionTokens: number,
  env?: { PRICING_JSON?: string }
): Promise<number> {
  // 1) Try DB pricing first
  try {
    const row = await supa.getModelPricing(model);
    if (row && Number.isFinite(row.input_per_1m) && Number.isFinite(row.output_per_1m)) {
      const costUsd =
        (promptTokens / 1_000_000) * Number(row.input_per_1m) +
        (completionTokens / 1_000_000) * Number(row.output_per_1m);

      return Math.max(0, Math.ceil(costUsd * 100));
    }
  } catch {
    // ignore DB errors and fall back
  }

  // 2) Fallback to env PRICING_JSON or DEFAULT_PRICES or conservative fallback
  return estimateCostCents(model, promptTokens, completionTokens, env);
}
