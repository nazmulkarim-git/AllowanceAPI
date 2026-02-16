"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Toast, useToast } from "@/components/Toast";
import { useSession } from "../_auth";
import { useRouter } from "next/navigation";

type ProfileRow = {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
};

export default function Admin() {
  const { loading, session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<{ email: string; is_admin: boolean } | null>(null);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast, toastProps } = useToast();

  const userId = session?.user?.id;

  const adminFetch = useMemo(() => {
    return async (path: string, init?: RequestInit) => {
      const token = session?.access_token;
      return fetch(path, { ...(init ?? {}), headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
    };
  }, [session?.access_token]);

  async function load() {
    if (!userId) return;
    const res = await adminFetch("/api/admin/users");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return;

    setProfile(j?.profile ?? null);
    setUsers(j?.users ?? []);
    if (!j?.profile?.is_admin) router.replace("/app");
  }

  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  async function setAdmin(id: string, is_admin: boolean) {
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/set-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_admin }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ kind: "error", title: "Request failed", message: j?.error?.message ?? "Failed" });
        return;
      }
      toast({ kind: "success", title: is_admin ? "Promoted" : "Demoted", message: "User role updated." });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    const ok = confirm("Delete user? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ kind: "error", title: "Request failed", message: j?.error?.message ?? "Failed" });
        return;
      }
      toast({ kind: "success", title: "Deleted", message: "User deleted." });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function adjustBalance() {
    const agentId = prompt("Agent ID");
    if (!agentId) return;
    const v = prompt("New balance (cents)");
    if (!v) return;
    const balance_cents = Number(v);
    if (Number.isNaN(balance_cents)) {
      toast({ kind: "error", title: "Invalid input", message: "Please enter a valid number." });
      return;
    }

    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/adjust-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, balance_cents }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ kind: "error", title: "Request failed", message: j?.error?.message ?? "Failed" });
        return;
      }
      toast({ kind: "success", title: "Done", message: "Operation completed." });
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey() {
    const key_hash = prompt("Paste key_hash to revoke");
    if (!key_hash) return;

    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/revoke-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_hash }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ kind: "error", title: "Request failed", message: j?.error?.message ?? "Failed" });
        return;
      }
      toast({ kind: "success", title: "Revoked", message: "Key revoked successfully." });
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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">Manage workspace users and emergency controls.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="ui-btn ui-btn-primary" onClick={adjustBalance} disabled={busy}>
              Adjust agent balance
            </button>
            <button className="ui-btn" onClick={revokeKey} disabled={busy}>
              Revoke key by hash
            </button>
          </div>
        </div>

        <div className="ui-card p-6">
          <div className="text-sm font-semibold text-white">Users</div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-white/[0.04] text-zinc-300">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{u.email ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{u.is_admin ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {u.is_admin ? (
                          <button className="ui-btn" onClick={() => setAdmin(u.id, false)} disabled={busy}>
                            Demote
                          </button>
                        ) : (
                          <button className="ui-btn" onClick={() => setAdmin(u.id, true)} disabled={busy}>
                            Promote
                          </button>
                        )}
                        <button className="ui-btn" onClick={() => deleteUser(u.id)} disabled={busy}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length ? (
                  <tr className="border-t border-white/10">
                    <td className="px-4 py-3 text-zinc-400" colSpan={4}>
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Toast {...toastProps} />
    </Layout>
  );
}
