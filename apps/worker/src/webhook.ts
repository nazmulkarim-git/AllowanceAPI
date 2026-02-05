export type TripEvent =
  | "circuit_breaker_tripped"
  | "velocity_cap_exceeded"
  | "insufficient_balance"
  | "model_not_allowed"
  | "key_frozen";

export async function sendWebhook(opts: {
  webhookUrl: string;
  webhookSecret?: string | null;
  event: TripEvent;
  agentId: string;
  model?: string;
  reason?: string;
  requestId?: string;
  timestamp: string;
}) {
  const { webhookUrl, webhookSecret, ...payload } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (webhookSecret) headers["X-Allowance-Webhook-Secret"] = webhookSecret;
  await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {});
}
