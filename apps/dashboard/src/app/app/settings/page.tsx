"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useSession } from "../_auth";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "../_api";
import { KeyRound, ShieldCheck, Save, Trash2 } from "lucide-react";

export default function Settings() {
  const { loading, session } = useSession();
  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const userId = session?.user?.id;

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).single();
    setProfile(p.data as any);

    const { data } = await supabase.from("provider_keys").select("created_at").eq("user_id", userId).maybeSingle();
    setHasKey(!!data?.created_at);
  }

  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  async function saveKey() {
    if (!openaiKey.trim()) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/provider-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openai", apiKey: openaiKey }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j?.error?.message ?? "Failed to save key");

      setOpenaiKey("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey() {
    const keyHash = prompt("Paste key_hash to revoke");
    if (!keyHash) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/admin/revoke-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_hash: keyHash }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j?.error?.message ?? "Failed to revoke");
      alert("Revoked.");
    } finally {
      setBusy(false);
    }
  }

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <div className="grid gap-6">
        <div className="ui-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Manage provider keys and security controls for this workspace.
              </p>
            </div>
            <span className="ui-pill">
              <ShieldCheck className="h-4 w-4" /> Security
            </span>
          </div>
        </div>

        <div className="ui-card p-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">OpenAI API key</div>
              <div className="text-sm text-zinc-400">
                Stored server-side. Used for agent execution and policy enforcement.
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <label className="ui-label">New key</label>
            <input
              className="ui-input"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button className="ui-btn ui-btn-primary" onClick={saveKey} disabled={busy}>
              <Save className="h-4 w-4" />
              Save key
            </button>

            <button className="ui-btn" onClick={revokeKey} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Revoke by key_hash
            </button>

            <div className="sm:ml-auto text-xs text-zinc-500">
              Status:{" "}
              {hasKey ? <span className="text-zinc-200">configured</span> : <span>not set</span>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
