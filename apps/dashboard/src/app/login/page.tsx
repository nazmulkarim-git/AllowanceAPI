// apps/dashboard/src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSignout = params.get("signout") === "1";

    (async () => {
      if (isSignout) {
        // Ensure session is destroyed, then stay on login page
        try {
          await supabase.auth.signOut();
        } catch {}
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith("sb-")) localStorage.removeItem(k);
          }
          for (const k of Object.keys(sessionStorage)) {
            if (k.startsWith("sb-")) sessionStorage.removeItem(k);
          }
        } catch {}
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.href = "/app";
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Check must_change_password
      const userId = data.session?.user?.id;
      if (userId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("id", userId)
          .maybeSingle();

        if (prof?.must_change_password) {
          window.location.href = "/change-password";
          return;
        }
      }

      window.location.href = "/app";
    } catch (err: any) {
      setMsg(err?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-white/70 hover:text-white">
        ← Back to home
      </Link>

      <h1 className="mt-6 text-2xl font-semibold text-white">Sign in</h1>
      <p className="mt-2 text-sm text-white/70">
        Forsig is invitation-only. Join the{" "}
        <Link href="/#waitlist" className="underline hover:text-white">
          waitlist
        </Link>{" "}
        to get access.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:shadow-white/20 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
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
