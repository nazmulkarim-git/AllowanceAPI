"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./_auth";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ArrowRight, Bot } from "lucide-react";

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

  const userId = session?.user?.id;
  const reduce = useReducedMotion();

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).single();
    setProfile(p.data as any);

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

  async function createAgent() {
    if (!name.trim() || !userId) return;
    setBusy(true);
    try {
      const { data: a, error } = await supabase
        .from("agents")
        .insert({ name, user_id: userId })
        .select("id")
        .single();
      if (error) return alert(error.message);

      await supabase.from("agent_policies").insert({
        agent_id: a.id,
        balance_cents: 200,
        allowed_models: ["gpt-4o-mini"],
        circuit_breaker_n: 10,
        velocity_window_seconds: 3600,
        velocity_cap_cents: 50,
      });

      setName("");
      await load();
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
              const bal = ((a.balance_cents ?? 0) / 100).toFixed(2);
              const velCap = ((a.velocity_cap_cents ?? 0) / 100).toFixed(2);
              const velMins = Math.round((a.velocity_window_seconds ?? 3600) / 60);
              const models = Array.isArray(a.allowed_models) ? a.allowed_models.join(", ") : "—";
              return (
                <motion.div key={a.id} {...item}>
                  <Link href={`/app/agents/${a.id}`} className="ui-card ui-card-hover block p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-white">{a.name}</div>
                          <span className="ui-pill">{a.status}</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400 truncate">
                          models: <span className="text-zinc-300">{models}</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <div className="text-xs text-zinc-400">Balance</div>
                          <div className="text-sm font-semibold text-white">${bal}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-400">Velocity</div>
                          <div className="text-sm font-semibold text-white">
                            ${velCap} / {velMins}m
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-500" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
