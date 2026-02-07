"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Variant = "primary" | "secondary" | "ghost";

export function OpenDashboardButton({
  className = "",
  children = "Open dashboard",
  variant = "primary",
}: {
  className?: string;
  children?: React.ReactNode;
  variant?: Variant;
}) {
  const [href, setHref] = useState("/login");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Landing page should not crash if env is not configured.
    if (!url || !anon) return;

    const supabase = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHref("/app");
    });
  }, []);

  const variantClass = useMemo(() => {
    if (className) return className;

    switch (variant) {
      case "secondary":
        return "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07]";
      case "ghost":
        return "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:text-white";
      case "primary":
      default:
        return "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:shadow-white/20";
    }
  }, [variant, className]);

  return (
    <Link href={href} className={variantClass}>
      {children}
    </Link>
  );
}
