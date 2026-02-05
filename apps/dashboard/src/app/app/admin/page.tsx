"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useSession } from "../_auth";
import { supabase } from "@/lib/supabaseClient";

export default function Admin() {
  const { loading, session } = useSession();
  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const userId = session?.user?.id;

  async function load() {
    if (!userId) return;
    const p = await supabase.from("profiles").select("email,is_admin").eq("id", userId).single();
    setProfile(p.data as any);

    if (!p.data?.is_admin) return;

    const u = await supabase.from("profiles").select("id,email,is_admin,created_at").order("created_at", { ascending: false }).limit(100);
    const a = await supabase.from("agents_with_policy").select("*").order("created_at", { ascending: false }).limit(200);
    setUsers(u.data ?? []);
    setAgents(a.data ?? []);
  }

  useEffect(() => { if (!loading) load(); }, [loading, userId]);

  const email = profile?.email ?? session?.user?.email ?? "";
  const isAdmin = !!profile?.is_admin;

  if (!isAdmin) {
    return (
      <Layout userEmail={email} isAdmin={isAdmin}>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-gray-600">You are not an admin.</p>
      </Layout>
    );
  }

  return (
    <Layout userEmail={email} isAdmin={isAdmin}>
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Users</h2>
          <div className="mt-3 space-y-2 text-sm">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-gray-500">{u.id}</div>
                </div>
                <div className="text-xs">{u.is_admin ? "admin" : "user"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Agents</h2>
          <div className="mt-3 space-y-2 text-sm">
            {agents.map(a => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-gray-500">${((a.balance_cents ?? 0)/100).toFixed(2)} | {a.status}</div>
                </div>
                <div className="text-xs text-gray-500">{a.user_id.slice(0, 6)}…</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
