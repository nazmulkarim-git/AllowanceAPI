// apps/dashboard/src/app/talk-to-founders/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function TalkToFounders() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    monthly_spend: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(
    null
  );

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/talk-to-founders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed");
      setStatus({ ok: true, msg: "Sent. We'll reply soon." });
      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        role: "",
        monthly_spend: "",
        message: "",
      });
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          ← Back
        </Link>
        <Link href="/docs" className="text-sm text-white/70 hover:text-white">
          Docs
        </Link>
      </div>

      <h1 className="mt-6 text-3xl font-semibold text-white">Talk to founders</h1>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Tell us what you’re building and what you need. We’ll respond personally.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            placeholder="Name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            placeholder="Email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            placeholder="Company (optional)"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            placeholder="Role (optional)"
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            placeholder="Monthly OpenAI spend (optional)"
            value={form.monthly_spend}
            onChange={(e) => set("monthly_spend", e.target.value)}
          />
        </div>

        <textarea
          className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          placeholder="What are you building? What are you worried about?"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:shadow-white/20 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send"}
          <ArrowRight className="h-4 w-4" />
        </button>

        {status ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status.ok
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/20 bg-red-500/10 text-red-200"
            }`}
          >
            {status.msg}
          </div>
        ) : null}
      </form>
    </main>
  );
}
