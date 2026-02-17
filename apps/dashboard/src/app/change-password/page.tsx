// apps/dashboard/src/app/change-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ChangePassword() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (pw1.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { error: e1 } = await supabase.auth.updateUser({ password: pw1 });
      if (e1) throw e1;

      // Clear must_change_password
      const { error: e2 } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);

      if (e2) throw e2;

      window.location.href = "/app";
    } catch (err: any) {
      setMsg(err?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-white">Change your password</h1>
      <p className="mt-2 text-sm text-white/70">
        You signed in with a temporary password. Please set a new password to continue.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          placeholder="New password"
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          placeholder="Confirm new password"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:shadow-white/20 disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>

        {msg ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {msg}
          </div>
        ) : null}
      </form>
    </div>
  );
}
