"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export function OpenDashboardButton({
  className = "",
  children = "Open dashboard",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [href, setHref] = useState("/login");

  useEffect(() => {
    // Guard: Landing should never crash if env is not configured.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    const supabase = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHref("/app");
    });
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
