/**
 * Pricing table (USD per 1M tokens).
 * You can override at deploy-time using env PRICING_JSON:
 * {
 *   "gpt-4o-mini": {"inputPer1M": 0.15, "outputPer1M": 0.60},
 *   "gpt-4o": {"inputPer1M": 5.0, "outputPer1M": 15.0}
 * }
 */
export type ModelPrice = { inputPer1M: number; outputPer1M: number };

const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o": { inputPer1M: 5.0, outputPer1M: 15.0 },
};

let cachedPrices: Record<string, ModelPrice> | null = null;

export function loadPrices(env?: { PRICING_JSON?: string }): Record<string, ModelPrice> {
  if (cachedPrices) return cachedPrices;

  if (env?.PRICING_JSON) {
    try {
      const parsed = JSON.parse(env.PRICING_JSON);
      if (parsed && typeof parsed === "object") {
        cachedPrices = parsed;
        return cachedPrices;
      }
    } catch {
      // fall back to defaults
    }
  }

  cachedPrices = DEFAULT_PRICES;
  return cachedPrices;
}

export function estimateCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
  env?: { PRICING_JSON?: string }
): number {
  const PRICES = loadPrices(env);
  const p = PRICES[model];
  if (!p) {
    // Conservative fallback: $0.0001/token
    return Math.max(0, Math.ceil((promptTokens + completionTokens) * 0.0001 * 100));
  }
  const cost = (promptTokens / 1_000_000) * p.inputPer1M + (completionTokens / 1_000_000) * p.outputPer1M;
  return Math.max(0, Math.ceil(cost * 100));
}
