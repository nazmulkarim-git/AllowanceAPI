"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/waitlist?secret=" + secret);
    const data = await res.json();
    if (res.ok) setWaitlist(data.data || []);
  }

  async function approve(email: string) {
    setMsg(null);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Approved: " + email);
      load();
    } else {
      setMsg(data?.error?.message || "Error");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">Admin — Waitlist</h1>

      <div className="mt-4 flex gap-2">
        <input
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
        />
        <button
          onClick={load}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Load
        </button>
      </div>

      {msg && (
        <div className="mt-4 text-sm text-emerald-300">{msg}</div>
      )}

      <div className="mt-6 space-y-3">
        {waitlist.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div>
              <div className="text-white">{w.email}</div>
              <div className="text-xs text-white/60">
                {w.company || "-"} · {w.status}
              </div>
            </div>
            {w.status === "pending" && (
              <button
                onClick={() => approve(w.email)}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                Approve
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
