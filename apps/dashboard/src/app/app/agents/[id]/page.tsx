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
  const [allowanceKey, setAllowanceKey] = useState<string | null>(null);
  const [modelsText, setModelsText] = useState("gpt-4o-mini");
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
      setModelsText(((pol.data as any).allowed_models ?? []).join(","));
    }

    const { data: keys } = await supabase.from("allowance_keys").select("prefix,revoked_at").eq("agent_id", params.id).order("created_at", { ascending: false }).limit(1);
    if (!keys?.length || keys[0].revoked_at) setAllowanceKey(null);
  }

  useEffect(() => { if (!loading) load(); }, [loading, userId]);

  async function mintKey() {
    const res = await authedFetch("/api/mint-key", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ agentId: params.id }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error?.message ?? "Failed");
    setAllowanceKey(json.key);
    await load();
  }

  async function savePolicy() {
    if (!policy) return;
    const allowed_models = modelsText.split(",").map(s=>s.trim()).filter(Boolean);
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
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ agentId: params.id }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error?.message ?? "Failed");
    setPolicy(prev => prev ? ({ ...prev, balance_cents: 0 }) : prev);
    alert("Agent frozen and balance set to $0.");
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{agent?.name ?? "Agent"}</h1>
          <p className="mt-1 text-sm text-gray-600">Configure allowance policies and keys.</p>
        </div>
        <div className="grid gap-1">
  <label className="text-xs text-gray-600">Webhook URL (optional)</label>
  <input className="rounded-md border px-3 py-2"
    placeholder="https://example.com/webhooks/allowance"
    value={policy?.webhook_url ?? ""}
    onChange={(e)=>setPolicy(prev => prev ? ({ ...prev, webhook_url: e.target.value }) : prev)}
  />
</div>
<div className="grid gap-1">
  <label className="text-xs text-gray-600">Webhook secret (optional header)</label>
  <input className="rounded-md border px-3 py-2"
    placeholder="shared-secret"
    value={policy?.webhook_secret ?? ""}
    onChange={(e)=>setPolicy(prev => prev ? ({ ...prev, webhook_secret: e.target.value }) : prev)}

  />
</div>

<div className="flex gap-2">
  {agent?.status === "frozen" ? (
    <button onClick={async ()=>{ 
      const res = await authedFetch("/api/freeze-toggle", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ agentId: params.id, status: "active" })});
      const j = await res.json();
      if (!res.ok) return alert(j?.error?.message ?? "Failed");
      setAgent(prev => prev ? ({ ...prev, status: "active" }) : prev);
      alert("Unfrozen.");
    }} className="rounded-md border px-4 py-2 hover:bg-gray-50">
      Unfreeze
    </button>
  ) : (
    <button onClick={async ()=>{ 
      const res = await authedFetch("/api/freeze-toggle", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ agentId: params.id, status: "frozen" })});
      const j = await res.json();
      if (!res.ok) return alert(j?.error?.message ?? "Failed");
      setAgent(prev => prev ? ({ ...prev, status: "frozen" }) : prev);
      alert("Frozen.");
    }} className="rounded-md border px-4 py-2 hover:bg-gray-50">
      Freeze
    </button>
  )}
  <button onClick={killSwitch} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">
    Kill Switch
  </button>
</div>
      </div>

      <div className="mt-6 grid gap-4">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Allowance Key</h2>
          <p className="mt-1 text-sm text-gray-600">Use this key as <code>Authorization: Bearer ...</code> when calling your proxy.</p>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={mintKey} className="rounded-md border px-3 py-2 hover:bg-gray-50">Generate key</button>
            {allowanceKey ? (
              <input readOnly className="w-full rounded-md border px-3 py-2 font-mono text-xs" value={allowanceKey} />
            ) : (
              <span className="text-sm text-gray-600">No active key generated yet.</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">Keys are shown only once. Store it safely.</p>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Policy</h2>
          {!policy ? <p className="mt-2 text-sm text-gray-600">Loading...</p> : (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-gray-600">Balance (cents)</label>
                <input className="rounded-md border px-3 py-2"
                  type="number"
                  value={policy.balance_cents}
                  onChange={(e)=>setPolicy({ ...policy, balance_cents: Number(e.target.value) })}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs text-gray-600">Allowed models (comma-separated)</label>
                <input className="rounded-md border px-3 py-2"
                  value={modelsText}
                  onChange={(e)=>setModelsText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Circuit breaker N</label>
                  <input className="rounded-md border px-3 py-2" type="number"
                    value={policy.circuit_breaker_n}
                    onChange={(e)=>setPolicy({ ...policy, circuit_breaker_n: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Velocity window (seconds)</label>
                  <input className="rounded-md border px-3 py-2" type="number"
                    value={policy.velocity_window_seconds}
                    onChange={(e)=>setPolicy({ ...policy, velocity_window_seconds: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-gray-600">Velocity cap (cents/window)</label>
                  <input className="rounded-md border px-3 py-2" type="number"
                    value={policy.velocity_cap_cents}
                    onChange={(e)=>setPolicy({ ...policy, velocity_cap_cents: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={savePolicy} className="rounded-md bg-black px-4 py-2 text-white">Save</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
