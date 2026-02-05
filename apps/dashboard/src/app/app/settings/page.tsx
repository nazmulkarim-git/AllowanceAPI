"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useSession } from "../_auth";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "../_api";

export default function Settings() {
  const { loading, session } = useSession();
  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);

  const userId = session?.user?.id;

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).single();
    setProfile(p.data as any);

    const { data } = await supabase.from("provider_keys").select("created_at").eq("user_id", userId).maybeSingle();
    setHasKey(!!data);
  }

  useEffect(() => { if (!loading) load(); }, [loading, userId]);

  async function save() {
    const res = await authedFetch("/api/provider-key", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: openaiKey }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error?.message ?? "Failed");
    setOpenaiKey("");
    setHasKey(true);
    alert("Saved.");
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">Configure your provider key (stored encrypted).</p>

      <div className="mt-6 rounded-xl border bg-white p-4">
        <h2 className="font-medium">OpenAI API key</h2>
        {hasKey ? <p className="mt-1 text-sm text-green-700">A key is stored.</p> : <p className="mt-1 text-sm text-gray-600">No key stored yet.</p>}
        <div className="mt-3 grid gap-2">
          <input className="rounded-md border px-3 py-2 font-mono text-xs" placeholder="sk-..." value={openaiKey} onChange={(e)=>setOpenaiKey(e.target.value)} />
          <button className="w-fit rounded-md bg-black px-4 py-2 text-white" onClick={save}>Save encrypted key</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          For production, consider storing provider keys in a managed secret store; this demo encrypts at rest using a server-side key.
        </p>
      </div>
    </Layout>
  );
}
