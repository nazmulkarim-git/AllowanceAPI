/**
 * Minimal pricing table (USD per 1M tokens). Update as you wish in code,
 * or replace with DB-driven pricing later.
 *
 * NOTE: Prices change over time; treat this as a placeholder.
 */
export type ModelPrice = { inputPer1M: number; outputPer1M: number };

export const PRICES: Record<string, ModelPrice> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o": { inputPer1M: 5.0, outputPer1M: 15.0 },
};

export function estimateCostCents(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICES[model];
  if (!p) return Math.ceil((promptTokens + completionTokens) * 0.0001); // fallback: $0.0001/token (very conservative)
  const cost = (promptTokens / 1_000_000) * p.inputPer1M + (completionTokens / 1_000_000) * p.outputPer1M;
  return Math.max(0, Math.ceil(cost * 100));
}
