type SupabaseResponse<T> = { data: T | null; error: any | null };

export class SupabaseAdmin {
  constructor(private url: string, private serviceRoleKey: string) {}

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.url}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Supabase error ${res.status}: ${JSON.stringify(json)}`);
    return json as T;
  }

  async getKeyRecordByHash(keyHash: string): Promise<{ agent_id: string; revoked_at: string | null } | null> {
    const q = new URLSearchParams({
      select: "agent_id,revoked_at",
      key_hash: `eq.${keyHash}`,
      limit: "1",
    });
    const out = await this.request<SupabaseResponse<any[]>>(`/rest/v1/allowance_keys?${q.toString()}`, { method: "GET" });
    return out.data?.[0] ?? null;
  }

  async getAgentWithPolicy(agentId: string): Promise<{
    id: string; user_id: string; status: string;
    balance_cents: number;
    allowed_models: string[];
    circuit_breaker_n: number;
    velocity_window_seconds: number;
    velocity_cap_cents: number;
    webhook_url?: string | null;
    webhook_secret?: string | null;
  } | null> {
    const q = new URLSearchParams({
      select: "id,user_id,status,balance_cents,allowed_models,circuit_breaker_n,velocity_window_seconds,velocity_cap_cents,webhook_url,webhook_secret",
      id: `eq.${agentId}`,
      limit: "1",
    });
    const out = await this.request<SupabaseResponse<any[]>>(`/rest/v1/agents_with_policy?${q.toString()}`, { method: "GET" });
    return out.data?.[0] ?? null;
  }

  async getEncryptedProviderKey(userId: string): Promise<string | null> {
    const q = new URLSearchParams({
      select: "encrypted_key",
      user_id: `eq.${userId}`,
      limit: "1",
    });
    const out = await this.request<SupabaseResponse<any[]>>(`/rest/v1/provider_keys?${q.toString()}`, { method: "GET" });
    return out.data?.[0]?.encrypted_key ?? null;
  }

  async insertSpendEvent(e: {
    agent_id: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_cents: number;
    request_id?: string;
  }): Promise<void> {
    await this.request(`/rest/v1/spend_events`, { method: "POST", body: JSON.stringify(e) });
  }

  async updateAgentPolicyBalance(agentId: string, balanceCents: number): Promise<void> {
    await this.request(`/rest/v1/agent_policies?agent_id=eq.${agentId}`, {
      method: "PATCH",
      body: JSON.stringify({ balance_cents: balanceCents, updated_at: new Date().toISOString() }),
    });
  }
}
