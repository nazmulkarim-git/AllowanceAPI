"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/app";
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. Check your email if confirmation is enabled. Then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/app";
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Error");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full rounded-md bg-black px-4 py-2 text-white">{mode === "signin" ? "Sign in" : "Sign up"}</button>
      </form>
      {msg ? <p className="mt-3 text-sm text-gray-700">{msg}</p> : null}
      <button className="mt-4 text-sm underline" onClick={()=>setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
