"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Variant = "primary" | "nav";

export function OpenDashboardButton({ variant = "nav" }: { variant?: Variant }) {
  const [href, setHref] = useState<string>("/login");

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setHref(data.session ? "/app" : "/login");
      })
      .catch(() => {
        // If anything fails (missing env vars in preview), fall back to login.
        if (!mounted) return;
        setHref("/login");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const className = useMemo(() => {
    if (variant === "primary") {
      return "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_-18px_rgba(255,255,255,0.65)] transition hover:bg-white/90";
    }
    return "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07]";
  }, [variant]);

  return (
    <Link href={href} className={className}>
      Open dashboard <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
