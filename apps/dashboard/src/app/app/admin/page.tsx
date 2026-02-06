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
      const msg = json?.error?.message || json?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return json;
  }

  async function load() {
    if (!session?.access_token) return;

    // 1) Verify admin
    try {
      await adminFetch("/api/admin/me");
      setIsAdmin(true);
    } catch (e: any) {
      setIsAdmin(false);
      // if not admin, show message (don’t redirect immediately; user can navigate away)
      return;
    }

    // 2) Load data
    try {
      const [uJson, aJson] = await Promise.all([
        adminFetch("/api/admin/users"),
        adminFetch("/api/admin/agents"),
      ]);
      setUsers(uJson.data ?? []);
      setAgents(aJson.data ?? []);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load admin data");
    }
  }

  async function agentControl(action: any) {
    setBusyAgentId(action?.agentId ?? null);
    try {
      await adminFetch("/api/admin/agent-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Action failed");
    } finally {
      setBusyAgentId(null);
    }
  }

  async function revokeKey() {
    const keyHash = prompt("Paste key_hash to revoke (from allowance_keys table):");
    if (!keyHash) return;
    try {
      await adminFetch("/api/admin/revoke-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_hash: keyHash.trim() }),
      });
      alert("Revoked.");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to revoke");
    }
  }

  async function setBalance(agentId: string) {
    const v = prompt("Set new balance in cents (e.g. 200 = $2.00):", "0");
    if (v === null) return;
    const cents = Number(v);
    if (!Number.isFinite(cents) || cents < 0) return alert("Invalid number.");
    await agentControl({ type: "set_balance", agentId, balance_cents: cents });
  }

  async function editPolicy(agent: any) {
    // Light-weight prompt UI for now (fast to ship for YC).
    // You can replace with a modal later.
    const allowedModelsStr = prompt(
      "Allowed models (comma separated). Leave empty to keep unchanged:",
      Array.isArray(agent.allowed_models) ? agent.allowed_models.join(",") : ""
    );
    if (allowedModelsStr === null) return;

    const cbStr = prompt(
      "Circuit breaker N (repeats before trip). Leave empty to keep unchanged:",
      String(agent.circuit_breaker_n ?? "")
    );
    if (cbStr === null) return;

    const windowStr = prompt(
      "Velocity window seconds (e.g. 3600). Leave empty to keep unchanged:",
      String(agent.velocity_window_seconds ?? "")
    );
    if (windowStr === null) return;

    const capStr = prompt(
      "Velocity cap cents in that window (e.g. 50 = $0.50). Leave empty to keep unchanged:",
      String(agent.velocity_cap_cents ?? "")
    );
    if (capStr === null) return;

    const webhookUrl = prompt(
      "Webhook URL (leave empty to clear, or keep unchanged by typing SAME):",
      agent.webhook_url ?? ""
    );
    if (webhookUrl === null) return;

    const webhookSecret = prompt(
      "Webhook secret (optional). Leave empty to clear, or keep unchanged by typing SAME:",
      agent.webhook_secret ?? ""
    );
    if (webhookSecret === null) return;

    const policy: any = {};

    // Allowed models
    if (allowedModelsStr.trim() !== "") {
      policy.allowed_models = allowedModelsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Circuit breaker
    if (cbStr.trim() !== "") {
      const n = Number(cbStr);
      if (!Number.isFinite(n) || n < 1) return alert("Invalid circuit breaker N.");
      policy.circuit_breaker_n = n;
    }

    // Velocity window
    if (windowStr.trim() !== "") {
      const w = Number(windowStr);
      if (!Number.isFinite(w) || w < 10) return alert("Invalid window seconds.");
      policy.velocity_window_seconds = w;
    }

    // Velocity cap
    if (capStr.trim() !== "") {
      const c = Number(capStr);
      if (!Number.isFinite(c) || c < 0) return alert("Invalid velocity cap cents.");
      policy.velocity_cap_cents = c;
    }

    // Webhook url/secret
    // "SAME" means keep unchanged. Empty means clear.
    if (webhookUrl !== "SAME") policy.webhook_url = webhookUrl.trim() === "" ? null : webhookUrl.trim();
    if (webhookSecret !== "SAME") policy.webhook_secret = webhookSecret.trim() === "" ? null : webhookSecret.trim();

    await agentControl({ type: "set_policy", agentId: agent.id, policy });
  }

  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session?.user?.id]);

  if (!isAdmin) {
    return (
      <Layout userEmail={email} isAdmin={false}>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-gray-600">You are not an admin.</p>
        <button
          className="mt-4 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => router.push("/app")}
        >
          Back to App
        </button>
      </Layout>
    );
  }

  return (
    <Layout userEmail={email} isAdmin={true}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Control Panel</h1>
        <div className="flex gap-2">
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => load()}
          >
            Refresh
          </button>
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            onClick={revokeKey}
          >
            Revoke Key (by key_hash)
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* USERS */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Users ({users.length})</h2>
          <div className="mt-3 space-y-2 text-sm">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-gray-500">{u.id}</div>
                </div>
                <div className="text-xs">{u.is_admin ? "admin" : "user"}</div>
              </div>
            ))}
            {users.length === 0 && <div className="text-xs text-gray-500">No users found.</div>}
          </div>
        </div>

        {/* AGENTS */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-medium">Agents ({agents.length})</h2>

          <div className="mt-3 space-y-3 text-sm">
            {agents.map((a) => {
              const busy = busyAgentId === a.id;
              const bal = ((Number(a.balance_cents ?? 0)) / 100).toFixed(2);
              const models = Array.isArray(a.allowed_models) ? a.allowed_models.join(", ") : "";

              return (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        ${bal} • <span className="font-medium">{a.status}</span> • user {String(a.user_id).slice(0, 6)}…
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        models: {models || "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">
                        {a.id}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {a.status === "frozen" ? (
                        <button
                          disabled={busy}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                          onClick={() => agentControl({ type: "unfreeze", agentId: a.id })}
                        >
                          Unfreeze
                        </button>
                      ) : (
                        <button
                          disabled={busy}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                          onClick={() => agentControl({ type: "freeze", agentId: a.id })}
                        >
                          Freeze
                        </button>
                      )}

                      <button
                        disabled={busy}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                        onClick={() => setBalance(a.id)}
                      >
                        Set Balance
                      </button>

                      <button
                        disabled={busy}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                        onClick={() => editPolicy(a)}
                      >
                        Edit Policy
                      </button>

                      <button
                        disabled={busy}
                        className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
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

            {agents.length === 0 && <div className="text-xs text-gray-500">No agents found.</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
