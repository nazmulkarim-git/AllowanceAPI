"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Toast, useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./_auth";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ArrowRight, Bot } from "lucide-react";
import { authedFetch } from "./_api";

type AgentRow = {
  id: string;
  name: string;
  status: string;
  balance_cents: number | null;
  allowed_models: string[] | null;
  velocity_window_seconds: number | null;
  velocity_cap_cents: number | null;
  circuit_breaker_n: number | null;
};

export default function AppHome() {
  const { loading, session } = useSession();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveByAgent, setLiveByAgent] = useState<Record<string, { balance_cents: number; velocity_cents: number; frozen: boolean }>>({});

  const userId = session?.user?.id;
  const reduce = useReducedMotion();
  const { toast, toastProps } = useToast();

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).maybeSingle();
    setProfile((p.data as any) ?? { email: session?.user?.email ?? "", is_admin: false });

    const { data, error } = await supabase
      .from("agents")
      .select(
        `
        id,
        name,
        status,
        created_at,
        user_id,
        agent_policies (
          balance_cents,
          allowed_models,
          circuit_breaker_n,
          velocity_window_seconds,
          velocity_cap_cents,
          webhook_url,
          webhook_secret
        )
      `
      )
      .order("created_at", { ascending: false });

    if (!error) {
      const rows = (data ?? []).map((a: any) => ({
        ...a,
        ...(Array.isArray(a.agent_policies) ? a.agent_policies[0] : a.agent_policies ?? {}),
      }));
      setAgents(rows as any);
    }
  }

  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  useEffect(() => {
    if (loading || agents.length === 0) return;
    let cancelled = false;
    let t: any = null;

    const tick = async () => {
      try {
        const results = await Promise.all(
          agents.map(async (a) => {
            const res = await authedFetch(`/api/live-balance?agentId=${encodeURIComponent(a.id)}`);
            if (!res.ok) return [a.id, null] as const;
            const json = await res.json().catch(() => null);
            if (!json) return [a.id, null] as const;
            return [
              a.id,
              {
                balance_cents: Number(json.balance_cents ?? 0),
                velocity_cents: Number(json.velocity_cents ?? 0),
                frozen: !!json.frozen,
              },
            ] as const;
          })
        );

        if (!cancelled) {
          const next: Record<string, any> = {};
          for (const [id, val] of results) if (val) next[id] = val;
          setLiveByAgent(next);
        }
      } catch {}

      if (!cancelled) t = setTimeout(tick, 800);
    };

    tick();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [loading, agents]);

  async function createAgent() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/create-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast({
          kind: "error",
          title: "Could not create agent",
          message: json?.error ?? "Unknown error",
        });
        return;
      }

      setName("");
      await load();
      toast({ kind: "success", title: "Agent created", message: "Your agent is ready to configure." });
    } finally {
      setBusy(false);
    }
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  const container = reduce
    ? {}
    : {
        initial: "hidden",
        animate: "show",
        variants: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
      };

  const item = reduce
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
        },
      };

  function money(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function windowLabel(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = seconds / 3600;
    return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
  }

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="flex flex-col gap-6">
        <div className="ui-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Agents</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Create an agent, set allowances, and copy its allowance key.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="ui-input sm:w-64"
                placeholder="Agent name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="ui-btn ui-btn-primary px-4" onClick={createAgent} disabled={busy}>
                <Plus className="h-4 w-4" />
                Add agent
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="ui-card p-4">
              <div className="text-xs text-zinc-400">Default budget</div>
              <div className="mt-1 text-sm font-semibold text-white">$2.00</div>
            </div>
            <div className="ui-card p-4">
              <div className="text-xs text-zinc-400">Default velocity</div>
              <div className="mt-1 text-sm font-semibold text-white">$0.50 / 60m</div>
            </div>
            <div className="ui-card p-4">
              <div className="text-xs text-zinc-400">Default models</div>
              <div className="mt-1 text-sm font-semibold text-white">gpt-4o-mini</div>
            </div>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="ui-empty">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="ui-empty-title">No agents yet</div>
            <div className="ui-empty-subtitle">
              Create your first agent, then configure its allowance policy and keys.
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button className="ui-btn ui-btn-primary" onClick={() => (document.querySelector("input") as any)?.focus()}>
                Create an agent <ArrowRight className="h-4 w-4" />
              </button>
              <Link className="ui-btn" href="/">
                Back to landing
              </Link>
            </div>
          </div>
        ) : (
          <motion.div {...container} className="grid gap-3">
            {agents.map((a) => {
              const configuredBal = a.balance_cents ?? 0;
              const live = liveByAgent[a.id];
              const liveBal = live?.balance_cents ?? null;
              const velNow = live?.velocity_cents ?? null;

              return (
                <motion.div key={a.id} {...item}>
                  <Link href={`/app/agents/${a.id}`} className="ui-card ui-card-hover block p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-white truncate">{a.name}</div>
                          {a.status ? <span className="ui-pill">{a.status}</span> : null}
                          {live?.frozen ? <span className="ui-pill">frozen</span> : null}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400 font-mono break-all">{a.id}</div>
                      </div>
                      <div className="ui-pill">
                        Configure <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[11px] text-zinc-400">Balance</div>
                        <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                          {money(configuredBal)}
                          {liveBal !== null ? (
                            <span className="ml-2 text-xs text-zinc-400">
                              live {money(liveBal)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[11px] text-zinc-400">Velocity</div>
                        <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                          {a.velocity_cap_cents != null ? money(a.velocity_cap_cents) : "—"}{" "}
                          <span className="text-xs text-zinc-400">/ {a.velocity_window_seconds != null ? windowLabel(a.velocity_window_seconds) : "—"}</span>
                          {velNow !== null ? (
                            <span className="ml-2 text-xs text-zinc-400">now {money(velNow)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[11px] text-zinc-400">Breaker</div>
                        <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                          {a.circuit_breaker_n ?? "—"}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <Toast {...toastProps} />
    </Layout>
  );
}
