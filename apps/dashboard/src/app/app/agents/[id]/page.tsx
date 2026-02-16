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

    const [{ data: prof }, { data: ag }, polRes, liveRes, keyRes, auditRes] = await Promise.all([
      supabase.from("profiles").select("email,is_admin").eq("id", userId).maybeSingle(),
      supabase.from("agents").select("id,name,status").eq("id", params.id).maybeSingle(),
      authedFetch(`/api/policy?agent_id=${encodeURIComponent(params.id)}`),
      authedFetch(`/api/live?agent_id=${encodeURIComponent(params.id)}`),
      authedFetch(`/api/allowance-key?agent_id=${encodeURIComponent(params.id)}`),
      authedFetch(`/api/audit?agent_id=${encodeURIComponent(params.id)}`),
    ]);

    setProfile(prof ?? null);
    setAgent((ag as any) ?? null);

    const polJson = await polRes.json().catch(() => null);
    if (polRes.ok && polJson?.policy) {
      setPolicy(polJson.policy);
      setSelectedModels(polJson.policy.allowed_models ?? []);
    }

    const liveJson = await liveRes.json().catch(() => null);
    if (liveRes.ok && liveJson?.live) setLive(liveJson.live);

    const keyJson = await keyRes.json().catch(() => null);
    if (keyRes.ok && keyJson?.key) {
      // minted key returned once
      setAllowanceKey(keyJson.key ?? null);
      setLastKeyPrefix(keyJson.prefix ?? null);
      setLastKeyRevokedAt(keyJson.revoked_at ?? null);
    } else if (keyRes.ok && keyJson?.prefix) {
      // key exists but hidden
      setAllowanceKey(null);
      setLastKeyPrefix(keyJson.prefix ?? null);
      setLastKeyRevokedAt(keyJson.revoked_at ?? null);
    }

    const auditJson = await auditRes.json().catch(() => null);
    if (auditRes.ok) {
      setAuditSummary(auditJson?.summary ?? null);
      setAuditByModel(auditJson?.by_model ?? []);
    }
  }

  async function savePolicy() {
    if (!policy) return;
    const body = {
      agent_id: params.id,
      balance_cents: Number(policy.balance_cents ?? 0),
      allowed_models: selectedModels,
      velocity_window_seconds: Number(policy.velocity_window_seconds ?? 10),
      velocity_cap_cents: Number(policy.velocity_cap_cents ?? 20),
      circuit_breaker_n: Number(policy.circuit_breaker_n ?? 6),
      webhook_url: policy.webhook_url ?? null,
      webhook_secret: policy.webhook_secret ?? null,
    };

    const res = await authedFetch("/api/policy", { method: "POST", body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      toast({ kind: "error", title: "Save failed", message: json?.error ?? "Could not save policy." });
      return;
    }
    toast({ kind: "success", title: "Saved", message: "Policy updated." });
    await load();
  }

  async function mintKey() {
    const res = await authedFetch("/api/allowance-key", {
      method: "POST",
      body: JSON.stringify({ agent_id: params.id }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      toast({ kind: "error", title: "Mint failed", message: json?.error ?? "Could not mint key." });
      return;
    }
    setAllowanceKey(json?.key ?? null);
    setLastKeyPrefix(json?.prefix ?? null);
    setLastKeyRevokedAt(null);
    toast({ kind: "success", title: "Minted", message: "New allowance key created." });
  }

  async function revokeKey() {
    const res = await authedFetch("/api/allowance-key", {
      method: "DELETE",
      body: JSON.stringify({ agent_id: params.id }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      toast({ kind: "error", title: "Revoke failed", message: json?.error ?? "Could not revoke key." });
      return;
    }
    setAllowanceKey(null);
    setLastKeyRevokedAt(new Date().toISOString());
    toast({ kind: "success", title: "Revoked", message: "Allowance key revoked." });
    await load();
  }

  useEffect(() => {
    if (loading || !userId) return;
    load().catch(() => null);

    let cancelled = false;
    let t: any = null;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await authedFetch(`/api/live?agent_id=${encodeURIComponent(params.id)}`);
        const json = await res.json().catch(() => null);
        if (res.ok && json?.live) setLive(json.live);
      } catch {}
      if (!cancelled) t = setTimeout(tick, 4000);
    };
    t = setTimeout(tick, 4000);

    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const email = profile?.email ?? "";
  const isAdmin = profile?.is_admin ?? false;

  const balanceLabel = useMemo(() => {
    const cents = policy?.balance_cents ?? live?.balance_cents ?? 0;
    return `$${(Number(cents) / 100).toFixed(2)}`;
  }, [policy?.balance_cents, live?.balance_cents]);

  const velocityLabel = useMemo(() => {
    const cents = live?.velocity_cents ?? 0;
    return `$${(Number(cents) / 100).toFixed(2)}`;
  }, [live?.velocity_cents]);

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="grid gap-6">
        <div className="ui-card p-6 w-full">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white">{agent?.name ?? "Agent"}</h1>
                {agent?.status ? <span className="ui-pill">{agent.status}</span> : null}
                {live?.frozen ? <span className="ui-pill">Frozen</span> : null}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Balance: <span className="text-zinc-200">{balanceLabel}</span> • Velocity:{" "}
                <span className="text-zinc-200">{velocityLabel}</span> / {windowLabel(policy?.velocity_window_seconds ?? 10)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="ui-btn"
                onClick={async () => {
                  await authedFetch("/api/freeze", { method: "POST", body: JSON.stringify({ agent_id: params.id }) });
                  toast({ kind: "success", title: "Frozen", message: "Agent frozen." });
                  await load();
                }}
              >
                Freeze
              </button>
              <button
                className="ui-btn ui-btn-danger"
                onClick={async () => {
                  await authedFetch("/api/kill", { method: "POST", body: JSON.stringify({ agent_id: params.id }) });
                  toast({ kind: "success", title: "Kill switch", message: "Kill switch activated." });
                  await load();
                }}
              >
                Kill switch
              </button>
            </div>
          </div>
        </div>

        {/* Keep a strict two-column grid so right-side cards don't drift/shift on wide screens. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)] lg:items-start">
          <div className="ui-card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Allowance policy</h2>
              <span className="ui-pill">live</span>
            </div>

            {policy ? (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="ui-label">Balance (cents)</label>
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      value={policy.balance_cents ?? 0}
                      onChange={(e) =>
                        setPolicy((prev) =>
                          prev ? { ...prev, balance_cents: Number(e.target.value || 0) } : prev
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="ui-label">Circuit breaker threshold (N)</label>
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      value={policy.circuit_breaker_n ?? 6}
                      onChange={(e) =>
                        setPolicy((prev) =>
                          prev ? { ...prev, circuit_breaker_n: Number(e.target.value || 0) } : prev
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="ui-label">Velocity window (seconds)</label>
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      value={policy.velocity_window_seconds ?? 10}
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
                      value={policy.velocity_cap_cents ?? 20}
                      onChange={(e) =>
                        setPolicy((prev) =>
                          prev ? { ...prev, velocity_cap_cents: Number(e.target.value || 0) } : prev
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="ui-label">Allowed models</label>
                  <select
                    className="ui-input"
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
                  <div className="sm:ml-auto text-xs text-zinc-500">
                    Tip: keep velocity low for early testing, then ramp.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 min-w-0">
            <div className="ui-card p-6 w-full">
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
                          Prefix: <span className="font-mono text-zinc-200">{lastKeyPrefix}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    {lastKeyRevokedAt ? (
                      <div className="mt-2 text-[11px] text-zinc-500">Last revoked: {new Date(lastKeyRevokedAt).toLocaleString()}</div>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button className="ui-btn ui-btn-primary" onClick={mintKey}>
                    Mint new key
                  </button>
                  <button className="ui-btn ui-btn-danger" onClick={revokeKey}>
                    Revoke key
                  </button>

                  <div className="sm:ml-auto text-xs text-zinc-500">
                    Example header: <span className="font-mono">Authorization: Bearer &lt;allowance_key&gt;</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ui-card p-6 w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Audit</h2>
                <span className="ui-pill">spend + token usage</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs text-zinc-400">Total spend</div>
                  <div className="mt-1 text-sm text-white">${((auditSummary?.spend_cents ?? 0) / 100).toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs text-zinc-400">Requests</div>
                  <div className="mt-1 text-sm text-white">{auditSummary?.requests ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs text-zinc-400">Prompt tokens</div>
                  <div className="mt-1 text-sm text-white">{auditSummary?.prompt_tokens ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs text-zinc-400">Completion tokens</div>
                  <div className="mt-1 text-sm text-white">{auditSummary?.completion_tokens ?? 0}</div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-zinc-400">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Model</th>
                      <th className="py-2 pr-3 font-medium">Requests</th>
                      <th className="py-2 pr-3 font-medium">Prompt</th>
                      <th className="py-2 pr-3 font-medium">Completion</th>
                      <th className="py-2 pr-3 font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-200">
                    {(auditByModel ?? []).length ? (
                      auditByModel.map((row, i) => (
                        <tr key={i} className="border-t border-white/10">
                          <td className="py-2 pr-3 font-mono text-[11px]">{row.model}</td>
                          <td className="py-2 pr-3">{row.requests}</td>
                          <td className="py-2 pr-3">{row.prompt_tokens}</td>
                          <td className="py-2 pr-3">{row.completion_tokens}</td>
                          <td className="py-2 pr-3">${((row.spend_cents ?? 0) / 100).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-white/10">
                        <td className="py-3 text-zinc-500" colSpan={5}>
                          No spend events yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Toast {...toastProps} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
