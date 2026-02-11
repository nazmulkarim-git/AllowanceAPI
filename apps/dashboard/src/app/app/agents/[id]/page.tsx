"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "../../_api";
import { useSession } from "../../_auth";

type Policy = {
  agent_id: string;
  balance_cents: number;
  allowed_models: string[];
  circuit_breaker_n: number;
  velocity_window_seconds: number;
  velocity_cap_cents: number;
  webhook_url?: string | null;
  webhook_secret?: string | null;
};

export default function AgentDetail({ params }: { params: { id: string } }) {
  const { loading, session } = useSession();
  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [agent, setAgent] = useState<{ id: string; name: string; status: string } | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [live, setLive] = useState<{ balance_cents: number; velocity_cents: number; frozen: boolean } | null>(null);
  const [allowanceKey, setAllowanceKey] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [lastKeyPrefix, setLastKeyPrefix] = useState<string | null>(null);
  const [lastKeyRevokedAt, setLastKeyRevokedAt] = useState<string | null>(null);

  const userId = session?.user?.id;
  const [auditSummary, setAuditSummary] = useState<any | null>(null);
  const [auditByModel, setAuditByModel] = useState<any[]>([]);

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).single();
    setProfile(p.data as any);

    const a = await supabase.from("agents").select("id,name,status").eq("id", params.id).single();
    if (a.error) return;
    setAgent(a.data as any);

    const pol = await supabase.from("agent_policies").select("*").eq("agent_id", params.id).single();
    if (!pol.error) {
      setPolicy(pol.data as any);
      setSelectedModels((pol.data as any).allowed_models ?? []);
    }

    const { data: keys } = await supabase
      .from("allowance_keys")
      .select("prefix,revoked_at")
      .eq("agent_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!keys?.length || keys[0].revoked_at) setAllowanceKey(null);
    if (keys?.length) {
      setLastKeyPrefix(keys[0].prefix ?? null);
      setLastKeyRevokedAt(keys[0].revoked_at ?? null);
    } else {
      setLastKeyPrefix(null);
      setLastKeyRevokedAt(null);
    }

    const sum = await supabase.from("agent_spend_summary").select("*").eq("agent_id", params.id).single();
      if (!sum.error) setAuditSummary(sum.data);

      const byModel = await supabase
        .from("agent_spend_by_model")
        .select("*")
        .eq("agent_id", params.id)
        .order("cost_cents", { ascending: false });

      if (!byModel.error) setAuditByModel(byModel.data ?? []);

  }

  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  // Live policy state from gateway cache (Upstash) for demo-quality "real-time" balance
  useEffect(() => {
    if (loading || !userId) return;
    let cancelled = false;
    let t: any = null;

    const tick = async () => {
      try {
        const res = await authedFetch(`/api/live-balance?agentId=${encodeURIComponent(params.id)}`);
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json) {
          setLive({
            balance_cents: Number(json.balance_cents ?? 0),
            velocity_cents: Number(json.velocity_cents ?? 0),
            frozen: !!json.frozen,
          });
        }
      } catch {}
      if (!cancelled) t = setTimeout(tick, 500);
    };

    tick();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [loading, userId, params.id]);

  async function mintKey() {
    const res = await authedFetch("/api/mint-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: params.id }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error?.message ?? "Failed");
    setAllowanceKey(json.key);
    await load();
  }

  useEffect(() => {
    if (loading || !userId) return;

    (async () => {
      try {
        const res = await authedFetch("/api/openai-models");
        const json = await res.json().catch(() => null);
        if (res.ok && json?.models?.length) setAvailableModels(json.models);
      } catch {
        // fallback: keep empty list
      }
    })();
  }, [loading, userId]);

  async function savePolicy() {
    if (!policy) return;
    const allowed_models = selectedModels;
    const res = await authedFetch("/api/save-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: params.id,
        policy: {
          ...policy,
          allowed_models,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error?.message ?? "Failed");
    alert("Saved.");
  }

  async function killSwitch() {
    const res = await authedFetch("/api/kill-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: params.id }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error?.message ?? "Failed");
    setPolicy((prev) => (prev ? { ...prev, balance_cents: 0 } : prev));
    alert("Agent frozen and balance set to $0.");
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="grid gap-6">
        <div className="ui-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white">{agent?.name ?? "Agent"}</h1>
                {agent?.status ? <span className="ui-pill">{agent.status}</span> : null}
              </div>
              <p className="mt-1 text-sm text-zinc-400">Configure allowance policies and keys.</p>
              {agent?.id ? <div className="mt-2 text-[11px] text-zinc-600">{agent.id}</div> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {agent?.status === "frozen" ? (
                <button
                  className="ui-btn"
                  onClick={async () => {
                    const res = await authedFetch("/api/freeze-toggle", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ agentId: params.id, freeze: false }),
                    });
                    if (!res.ok) return alert("Failed");
                    await load();
                  }}
                >
                  Unfreeze
                </button>
              ) : (
                <button
                  className="ui-btn"
                  onClick={async () => {
                    const res = await authedFetch("/api/freeze-toggle", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ agentId: params.id, freeze: true }),
                    });
                    if (!res.ok) return alert("Failed");
                    await load();
                  }}
                >
                  Freeze
                </button>
              )}

              <button
                className="ui-btn border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                onClick={() => {
                  const ok = confirm("Kill switch will freeze the agent and set balance to $0. Continue?");
                  if (ok) killSwitch();
                }}
              >
                Kill switch
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Policy */}
          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Allowance policy</h2>
              <span className="ui-pill">live</span>
            </div>

            {live && policy ? (
              <div className="mt-2 text-xs text-zinc-400">
                Configured: <span className="text-white">${(policy.balance_cents / 100).toFixed(2)}</span> •{" "}
                Live remaining: <span className="text-white">${(live.balance_cents / 100).toFixed(2)}</span> •{" "}
                Spent: <span className="text-white">${((policy.balance_cents - live.balance_cents) / 100).toFixed(2)}</span>
                <span className="mx-2 text-zinc-600">|</span>
                Velocity now: <span className="text-white">${(live.velocity_cents / 100).toFixed(2)}</span> /{" "}
                <span className="text-white">${(policy.velocity_cap_cents / 100).toFixed(2)}</span>{" "}
                per <span className="text-white">{policy.velocity_window_seconds}s</span>
                {live.frozen ? <span className="ml-2 ui-pill">frozen</span> : null}
              </div>
            ) : live ? (
              <div className="mt-2 text-xs text-zinc-400">
                Live remaining: <span className="text-white">${(live.balance_cents / 100).toFixed(2)}</span> • Velocity now:{" "}
                <span className="text-white">${(live.velocity_cents / 100).toFixed(2)}</span>
                {live.frozen ? <span className="ml-2 ui-pill">frozen</span> : null}
              </div>
            ) : null}


            {!policy ? (
              <div className="mt-4 text-sm text-zinc-400">No policy found.</div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <label className="ui-label">
                    Balance (cents) <span className="text-zinc-500">(${(policy.balance_cents / 100).toFixed(2)})</span>
                  </label>
                  <input
                    className="ui-input"
                    inputMode="numeric"
                    value={policy.balance_cents}
                    onChange={(e) =>
                      setPolicy((prev) => (prev ? { ...prev, balance_cents: Number(e.target.value || 0) } : prev))
                    }
                  />
                  <div className="text-xs text-zinc-500">Displayed as dollars in the app. Stored as cents.</div>
                </div>

                <div className="grid gap-2">
                  <label className="ui-label">Allowed models</label>

                    <select
                      className="ui-input h-40"
                      multiple
                      value={selectedModels}
                      onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                        setSelectedModels(opts);
                      }}
                    >
                      {availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <div className="text-xs text-zinc-500">
                      Tip: Select none (empty) to allow all models.
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="ui-btn" type="button" onClick={() => setSelectedModels([])}>
                        Allow all
                      </button>
                      <button
                        className="ui-btn"
                        type="button"
                        onClick={() => setSelectedModels(availableModels)}
                        disabled={!availableModels.length}
                      >
                        Select all
                      </button>
                    </div>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="ui-label">Velocity window (seconds)</label>
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      value={policy.velocity_window_seconds}
                      onChange={(e) =>
                        setPolicy((prev) =>
                          prev ? { ...prev, velocity_window_seconds: Number(e.target.value || 0) } : prev
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="ui-label">Velocity cap (cents)</label>
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      value={policy.velocity_cap_cents}
                      onChange={(e) =>
                        setPolicy((prev) => (prev ? { ...prev, velocity_cap_cents: Number(e.target.value || 0) } : prev))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="ui-label">Circuit breaker threshold (N)</label>
                  <input
                    className="ui-input"
                    inputMode="numeric"
                    value={policy.circuit_breaker_n}
                    onChange={(e) =>
                      setPolicy((prev) => (prev ? { ...prev, circuit_breaker_n: Number(e.target.value || 0) } : prev))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="ui-label">Webhook URL (optional)</label>
                    <input
                      className="ui-input"
                      placeholder="https://example.com/webhooks/allowance"
                      value={policy.webhook_url ?? ""}
                      onChange={(e) => setPolicy((prev) => (prev ? { ...prev, webhook_url: e.target.value } : prev))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="ui-label">Webhook secret (optional header)</label>
                    <input
                      className="ui-input"
                      placeholder="shared-secret"
                      value={policy.webhook_secret ?? ""}
                      onChange={(e) => setPolicy((prev) => (prev ? { ...prev, webhook_secret: e.target.value } : prev))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button className="ui-btn ui-btn-primary" onClick={savePolicy}>
                    Save policy
                  </button>
                  <button className="ui-btn" onClick={load}>
                    Reload
                  </button>
                  <div className="sm:ml-auto text-xs text-zinc-500">
                    Tip: keep velocity low for early testing, then ramp.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Keys */}
          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Allowance key</h2>
              <span className="ui-pill">auth</span>
            </div>

            {/* Audit */}
            <div className="ui-card p-6">
              <h2 className="text-sm font-semibold text-white">Audit</h2>
              <p className="mt-1 text-sm text-zinc-400">Spend + token usage for this agent.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Total spend</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    ${((auditSummary?.cost_cents ?? 0) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Requests</div>
                  <div className="mt-1 text-lg font-semibold text-white">{auditSummary?.request_count ?? 0}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Prompt tokens</div>
                  <div className="mt-1 text-lg font-semibold text-white">{auditSummary?.prompt_tokens ?? 0}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Completion tokens</div>
                  <div className="mt-1 text-lg font-semibold text-white">{auditSummary?.completion_tokens ?? 0}</div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] text-zinc-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Model</th>
                      <th className="px-4 py-3 text-right">Requests</th>
                      <th className="px-4 py-3 text-right">Prompt</th>
                      <th className="px-4 py-3 text-right">Completion</th>
                      <th className="px-4 py-3 text-right">Spend</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-200">
                    {auditByModel.map((r) => (
                      <tr key={r.model ?? "unknown"} className="border-t border-white/10">
                        <td className="px-4 py-3">{r.model ?? "unknown"}</td>
                        <td className="px-4 py-3 text-right">{r.request_count ?? 0}</td>
                        <td className="px-4 py-3 text-right">{r.prompt_tokens ?? 0}</td>
                        <td className="px-4 py-3 text-right">{r.completion_tokens ?? 0}</td>
                        <td className="px-4 py-3 text-right">${((r.cost_cents ?? 0) / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                    {!auditByModel.length ? (
                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 text-zinc-400" colSpan={5}>
                          No spend events yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>


            <div className="mt-4 grid gap-3">
              {allowanceKey ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs text-zinc-400">Minted key (copy now)</div>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <code className="ui-kbd break-all">{allowanceKey}</code>
                    <button
                      className="ui-btn"
                      onClick={async () => {
                        await navigator.clipboard.writeText(allowanceKey);
                        alert("Copied.");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    This is shown once. Store it securely.
                  </div>
                </div>
              ) : (
                <div className="ui-empty">
                  {lastKeyPrefix ? (
                    <>
                      <div className="ui-empty-title">Key exists (hidden)</div>
                      <div className="ui-empty-subtitle">
                        Prefix: <span className="text-zinc-200">{lastKeyPrefix}</span>{" "}
                        {live?.frozen ? <span className="ml-2 ui-pill">frozen</span> : null}
                        {lastKeyRevokedAt ? <span className="ml-2 ui-pill">revoked</span> : null}
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        For safety, the full key is only shown once during mint.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ui-empty-title">No key yet</div>
                      <div className="ui-empty-subtitle">Mint a new key to authenticate agent calls.</div>
                    </>
                  )}
                </div>
              )}

              <button className="ui-btn ui-btn-primary" onClick={mintKey}>
                Mint new key
              </button>

              <div className="ui-card p-4">
                <div className="text-xs text-zinc-400">Example header</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <code className="ui-kbd truncate">Authorization: Bearer &lt;allowance_key&gt;</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
