"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./_auth";

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
  const userId = session?.user?.id;

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).single();
    setProfile(p.data as any);

    const { data, error } = await supabase.from("agents_with_policy").select("*").order("created_at", { ascending: false });
    if (!error) setAgents((data ?? []) as any);
  }

  useEffect(() => { if (!loading) load(); }, [loading, userId]);

  async function createAgent() {
    if (!name.trim()) return;
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
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agents</h1>
          <p className="mt-1 text-sm text-gray-600">Create an agent, set allowances, and copy its allowance key.</p>
        </div>
        <div className="flex gap-2">
          <input className="rounded-md border px-3 py-2" placeholder="Agent name" value={name} onChange={(e)=>setName(e.target.value)} />
          <button className="rounded-md bg-black px-4 py-2 text-white" onClick={createAgent}>Add</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {agents.map(a => (
          <Link key={a.id} href={`/app/agents/${a.id}`} className="rounded-xl border bg-white p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="mt-1 text-xs text-gray-600">Status: {a.status}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">${((a.balance_cents ?? 0)/100).toFixed(2)}</div>
                <div className="mt-1 text-xs text-gray-600">Velocity: ${( (a.velocity_cap_cents ?? 0)/100 ).toFixed(2)} / {(a.velocity_window_seconds ?? 3600)/60}m</div>
              </div>
            </div>
          </Link>
        ))}
        {!agents.length ? <div className="rounded-xl border bg-white p-6 text-gray-600">No agents yet.</div> : null}
      </div>
    </Layout>
  );
}
