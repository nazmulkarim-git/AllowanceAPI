"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useSession } from "../_auth";
import { useRouter } from "next/navigation";

type AdminProfile = { email?: string; is_admin?: boolean };

export default function Admin() {
  const router = useRouter();
  const { loading, session } = useSession();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);

  const email = useMemo(() => session?.user?.email ?? profile?.email ?? "", [session, profile]);

  async function adminFetch(path: string, init?: RequestInit) {
    const token = session?.access_token;
    if (!token) throw new Error("missing_session");

    const res = await fetch(path, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message ?? res.statusText;
      throw new Error(msg);
    }
    return json;
  }

  async function load() {
    if (!session?.access_token) return;

    const prof = await adminFetch("/api/admin/me");
    setProfile(prof?.profile);
    setIsAdmin(!!prof?.profile?.is_admin);

    const us = await adminFetch("/api/admin/users");
    setUsers(us?.users ?? []);

    const as = await adminFetch("/api/admin/agents");
    setAgents(as?.agents ?? []);
  }

  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session?.access_token]);

  async function agentControl(args: { type: "freeze" | "unfreeze" | "kill"; agentId: string }) {
    setBusyAgentId(args.agentId);
    try {
      await adminFetch("/api/admin/agent-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusyAgentId(null);
    }
  }

  async function revokeKey() {
    const key_hash = prompt("Enter key_hash to revoke");
    if (!key_hash) return;
    try {
      await adminFetch("/api/admin/revoke-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_hash }),
      });
      alert("Revoked.");
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    }
  }

  async function setBalance(agentId: string) {
    const v = prompt("New balance in cents (e.g. 200 = $2.00)");
    if (!v) return;
    const balance_cents = Number(v);
    if (Number.isNaN(balance_cents)) return alert("Invalid number");
    try {
      await adminFetch("/api/admin/agent-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "set_balance", agentId, balance_cents }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    }
  }

  async function editPolicy(agent: any) {
    const models = prompt("allowed_models (comma-separated)", (agent.allowed_models ?? []).join(",")) ?? "";
    const circuit_breaker_n = Number(prompt("circuit_breaker_n", String(agent.circuit_breaker_n ?? 10)) ?? "10");
    const velocity_window_seconds = Number(prompt("velocity_window_seconds", String(agent.velocity_window_seconds ?? 3600)) ?? "3600");
    const velocity_cap_cents = Number(prompt("velocity_cap_cents", String(agent.velocity_cap_cents ?? 50)) ?? "50");

    try {
      await adminFetch("/api/admin/agent-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "edit_policy",
          agentId: agent.id,
          allowed_models: models.split(",").map((s: string) => s.trim()).filter(Boolean),
          circuit_breaker_n,
          velocity_window_seconds,
          velocity_cap_cents,
        }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    }
  }

  if (!isAdmin) {
    return (
      <Layout userEmail={email} isAdmin={false}>
        <div className="ui-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Admin</h1>
          <p className="mt-2 text-sm text-zinc-400">You are not an admin.</p>
          <button className="mt-5 ui-btn ui-btn-primary" onClick={() => router.push("/app")}>
            Back to App
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userEmail={email} isAdmin={true}>
      <div className="grid gap-6">
        <div className="ui-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Admin Control Panel</h1>
              <p className="mt-1 text-sm text-zinc-400">Users, agents, and emergency controls.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button className="ui-btn" onClick={() => load()}>
                Refresh
              </button>
              <button className="ui-btn" onClick={revokeKey}>
                Revoke key (by key_hash)
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* USERS */}
          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Users</h2>
              <span className="ui-pill">{users.length}</span>
            </div>

            {users.length === 0 ? (
              <div className="mt-4 text-sm text-zinc-400">No users found.</div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="ui-th">Email</th>
                      <th className="ui-th">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.03]">
                        <td className="ui-td">
                          <div className="font-medium text-zinc-100">{u.email}</div>
                          <div className="mt-1 text-[11px] text-zinc-500">{u.id}</div>
                        </td>
                        <td className="ui-td">
                          <span className="ui-pill">{u.is_admin ? "admin" : "user"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AGENTS */}
          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Agents</h2>
              <span className="ui-pill">{agents.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              {agents.map((a) => {
                const busy = busyAgentId === a.id;
                const bal = ((Number(a.balance_cents ?? 0)) / 100).toFixed(2);
                const models = Array.isArray(a.allowed_models) ? a.allowed_models.join(", ") : "";

                return (
                  <div key={a.id} className="ui-card ui-card-hover p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-white">{a.name}</div>
                          <span className="ui-pill">{a.status}</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          ${bal} • <span className="text-zinc-200">user</span> {String(a.user_id).slice(0, 6)}…
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">models: {models || "—"}</div>
                        <div className="mt-1 text-[11px] text-zinc-600">{a.id}</div>
                      </div>

                      <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                        {a.status === "frozen" ? (
                          <button
                            disabled={busy}
                            className="ui-btn"
                            onClick={() => agentControl({ type: "unfreeze", agentId: a.id })}
                          >
                            Unfreeze
                          </button>
                        ) : (
                          <button
                            disabled={busy}
                            className="ui-btn"
                            onClick={() => agentControl({ type: "freeze", agentId: a.id })}
                          >
                            Freeze
                          </button>
                        )}

                        <button disabled={busy} className="ui-btn" onClick={() => setBalance(a.id)}>
                          Set balance
                        </button>

                        <button disabled={busy} className="ui-btn" onClick={() => editPolicy(a)}>
                          Edit policy
                        </button>

                        <button
                          disabled={busy}
                          className="ui-btn border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                          onClick={() => {
                            const ok = confirm("Kill = set balance to 0 and freeze. Continue?");
                            if (ok) agentControl({ type: "kill", agentId: a.id });
                          }}
                        >
                          Kill
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {agents.length === 0 ? <div className="text-sm text-zinc-400">No agents found.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
