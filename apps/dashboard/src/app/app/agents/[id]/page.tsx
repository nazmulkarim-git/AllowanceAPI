"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Toast, useToast } from "@/components/Toast";
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

function windowLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = seconds / 3600;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

export default function AgentDetail({ params }: { params: { id: string } }) {
  const { loading, session } = useSession();
  const { toast, toastProps } = useToast();

  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [agent, setAgent] = useState<{ id: string; name: string; status: string } | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [live, setLive] = useState<{ balance_cents: number; velocity_cents: number; frozen: boolean } | null>(null);

  const [allowanceKey, setAllowanceKey] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [lastKeyPrefix, setLastKeyPrefix] = useState<string | null>(null);
  const [lastKeyRevokedAt, setLastKeyRevokedAt] = useState<string | null>(null);

  const [auditSummary, setAuditSummary] = useState<any | null>(null);
  const [auditByModel, setAuditByModel] = useState<any[]>([]);

  const userId = session?.user?.id;

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
      setSelectedModels(((pol.data as any).allowed_models ?? []) as string[]);
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
      if (!cancelled) t = setTimeout(tick, 650);
    };

    tick();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [loading, userId, params.id]);

  useEffect(() => {
    if (loading || !userId) return;
    (async () => {
      try {
        const res = await authedFetch("/api/openai-models");
        const json = await res.json().catch(() => null);
        if (res.ok && json?.models?.length) setAvailableModels(json.models);
      } catch {}
    })();
  }, [loading, userId]);

  async function mintKey() {
    const res = await authedFetch("/api/mint-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: params.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ kind: "error", title: "Mint failed", message: json?.error?.message ?? "Failed" });
      return;
    }
    setAllowanceKey(json.key);
    toast({ kind: "success", title: "Key minted", message: "Copy the key now. It will only be shown once." });
    await load();
  }

  async function savePolicy() {
    if (!policy) return;

    const res = await authedFetch("/api/save-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: params.id,
        policy: { ...policy, allowed_models: selectedModels },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ kind: "error", title: "Save failed", message: json?.error?.message ?? "Failed" });
      return;
    }
    toast({ kind: "success", title: "Saved", message: "Allowance policy updated." });
    await load();
  }

  async function killSwitch() {
    const res = await authedFetch("/api/kill-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: params.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ kind: "error", title: "Kill switch failed", message: json?.error?.message ?? "Failed" });
      return;
    }
    setPolicy((prev) => (prev ? { ...prev, balance_cents: 0 } : prev));
    toast({ kind: "success", title: "Kill switch enabled", message: "Agent frozen and balance set to $0." });
    await load();
  }

  async function setFreeze(freeze: boolean) {
    const res = await authedFetch("/api/freeze-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: params.id, freeze }),
    });
    if (!res.ok) {
      toast({ kind: "error", title: "Update failed", message: "Could not change frozen state." });
      return;
    }
    toast({ kind: "success", title: freeze ? "Frozen" : "Unfrozen", message: "Agent status updated." });
    await load();
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  const liveSummary = useMemo(() => {
    if (!live) return null;
    const parts = [
      `Live remaining: $${(live.balance_cents / 100).toFixed(2)}`,
      `Velocity: $${(live.velocity_cents / 100).toFixed(2)}`,
    ];
    if (live.frozen) parts.push("Frozen");
    return parts.join(" • ");
  }, [live]);

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="grid gap-6">
        <div className="ui-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  {agent?.name ?? "Agent"}
                </h1>
                {agent?.status ? <span className="ui-pill">{agent.status}</span> : null}
                {live?.frozen ? <span className="ui-pill">frozen</span> : null}
              </div>
              <p className="mt-1 text-sm text-zinc-400">Configure allowance policies and keys.</p>
              {agent?.id ? (
                <div className="mt-2 font-mono text-[11px] text-zinc-600 break-all">{agent.id}</div>
              ) : null}
              {liveSummary ? <div className="mt-2 text-xs text-zinc-400">{liveSummary}</div> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {agent?.status === "frozen" ? (
                <button className="ui-btn" onClick={() => setFreeze(false)}>
                  Unfreeze
                </button>
              ) : (
                <button className="ui-btn" onClick={() => setFreeze(true)}>
                  Freeze
                </button>
              )}

              <button
                className="ui-btn ui-btn-danger"
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

        {/* Keep a strict two-column grid so right-side cards don't drift/shift on wide screens. */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Allowance policy</h2>
              <span className="ui-pill">live</span>
            </div>

            {live && policy ? (
              <div className="mt-2 text-xs text-zinc-400">
                Configured: <span className="text-white">${(policy.balance_cents / 100).toFixed(2)}</span> • Live
                remaining: <span className="text-white">${(live.balance_cents / 100).toFixed(2)}</span> • Spent:{" "}
                <span className="text-white">
                  ${((policy.balance_cents - live.balance_cents) / 100).toFixed(2)}
                </span>
                <span className="mx-2 text-zinc-600">|</span>
                Velocity now: <span className="text-white">${(live.velocity_cents / 100).toFixed(2)}</span> /{" "}
                <span className="text-white">${(policy.velocity_cap_cents / 100).toFixed(2)}</span> per{" "}
                <span className="text-white">{windowLabel(policy.velocity_window_seconds)}</span>
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
                    type="number"
                    min={0}
                    step={1}
                    value={String(policy.balance_cents ?? 0)}
                    onChange={(e) =>
                      setPolicy((prev) =>
                        prev ? { ...prev, balance_cents: Number(e.target.value || 0) } : prev
                      )
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
                  <div className="text-xs text-zinc-500">Tip: Select none (empty) to allow all models.</div>
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
                      type="number"
                      min={1}
                      step={1}
                      value={String(policy.velocity_window_seconds ?? 0)}
                      onChange={(e) =>
                        setPolicy((prev) =>
                          prev ? { ...prev, velocity_window_seconds: Number(e.target.value || 0) } : prev
                        )
                      }
                    />
                    <div className="text-xs text-zinc-500">
                      Shown as {windowLabel(policy.velocity_window_seconds)} in the UI.
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="ui-label">Velocity cap (cents)</label>
                    <input
                      className="ui-input"
                      type="number"
                      min={0}
                      step={1}
                      value={String(policy.velocity_cap_cents ?? 0)}
                      onChange={(e) =>
                        setPolicy((prev) =>
                          prev ? { ...prev, velocity_cap_cents: Number(e.target.value || 0) } : prev
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="ui-label">Circuit breaker threshold (N)</label>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    step={1}
                    value={String(policy.circuit_breaker_n ?? 0)}
                    onChange={(e) =>
                      setPolicy((prev) =>
                        prev ? { ...prev, circuit_breaker_n: Number(e.target.value || 0) } : prev
                      )
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
                      onChange={(e) =>
                        setPolicy((prev) => (prev ? { ...prev, webhook_secret: e.target.value } : prev))
                      }
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
                  <div className="sm:ml-auto text-xs text-zinc-500">Tip: keep velocity low for early testing, then ramp.</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <div className="ui-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Allowance key</h2>
                <span className="ui-pill">auth</span>
              </div>

              <div className="mt-4 grid gap-3">
                {allowanceKey ? (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-zinc-400">Minted key (copy now)</div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-mono text-xs text-white break-all">{allowanceKey}</div>
                      <button
                        className="ui-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(allowanceKey);
                          toast({ kind: "success", title: "Copied", message: "Allowance key copied to clipboard." });
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-zinc-500">
                      For safety, the full key is only shown once during mint.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-zinc-400">Key exists (hidden)</div>
                    <div className="mt-1 text-sm text-zinc-300">
                      {lastKeyPrefix ? (
                        <>
                          Prefix: <span className="font-mono text-zinc-100">{lastKeyPrefix}</span>
                        </>
                      ) : (
                        "No key minted yet."
                      )}
                    </div>
                    {lastKeyRevokedAt ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        Revoked: {new Date(lastKeyRevokedAt).toLocaleString()}
                      </div>
                    ) : null}
                    <div className="mt-2 text-[11px] text-zinc-500">
                      For safety, the full key is only shown once during mint.
                    </div>
                  </div>
                )}

                <button className="ui-btn ui-btn-primary w-full" onClick={mintKey}>
                  Mint new key
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Example header</div>
                  <div className="mt-2 font-mono text-xs text-zinc-200 break-all">
                    Authorization: Bearer &lt;allowance_key&gt;
                  </div>
                </div>
              </div>
            </div>

            <div className="ui-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Audit</h2>
                  <p className="mt-1 text-sm text-zinc-400">Spend + token usage for this agent.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Total spend</div>
                  <div className="mt-1 text-lg font-semibold text-white break-all tabular-nums leading-tight">
                    ${((auditSummary?.cost_cents ?? 0) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Requests</div>
                  <div className="mt-1 text-lg font-semibold text-white break-all tabular-nums leading-tight">
                    {auditSummary?.request_count ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Prompt tokens</div>
                  <div className="mt-1 text-lg font-semibold text-white break-all tabular-nums leading-tight">
                    {auditSummary?.prompt_tokens ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-zinc-400">Completion tokens</div>
                  <div className="mt-1 text-lg font-semibold text-white break-all tabular-nums leading-tight">
                    {auditSummary?.completion_tokens ?? 0}
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-[720px] w-full text-sm">
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
          </div>
        </div>
      </div>

      <Toast {...toastProps} />
    </Layout>
  );
}
