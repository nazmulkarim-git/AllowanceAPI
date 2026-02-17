"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut, LayoutGrid, Settings, Shield, Sparkles } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const NAV = [
  { href: "/app", label: "Agents", icon: LayoutGrid },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default function Layout({
  children,
  userEmail,
  isAdmin,
}: {
  children: ReactNode;
  userEmail?: string;
  isAdmin?: boolean;
}) {
  const reduce = useReducedMotion();
  const pathname = usePathname();

  const headerMotion = useMemo(
    () =>
      reduce
        ? {}
        : {
            initial: { y: -10, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            transition: { duration: 0.35, ease: "easeOut" as const },
          },
    [reduce]
  );

  const contentMotion = useMemo(
    () =>
      reduce
        ? {}
        : {
            initial: { y: 8, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            transition: { duration: 0.45, ease: "easeOut" as const },
          },
    [reduce]
  );

  return (
    <div className="min-h-screen">
      <motion.header
        {...headerMotion}
        className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur"
      >
        <div className="ui-container flex items-center justify-between py-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Sparkles className="h-4 w-4 text-zinc-100" />
              <span className="absolute inset-0 -z-10 rounded-xl bg-white/10 blur-xl opacity-0 transition group-hover:opacity-100" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-zinc-100">Forsig</div>
              <div className="text-[11px] text-zinc-400">Allowance-native agents</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {userEmail ? (
                <span className="ui-pill max-w-[220px] truncate" title={userEmail}>
                  {userEmail}
                </span>
              ) : null}
            </div>
            <button
              className="ui-btn"
              onClick={async () => {
                try {
                  // Best-effort sign out
                  await supabase.auth.signOut();
                } catch {}

                // Always hard-clear any Supabase auth leftovers
                try {
                  for (const k of Object.keys(localStorage)) {
                    if (k.startsWith("sb-")) localStorage.removeItem(k);
                  }
                  for (const k of Object.keys(sessionStorage)) {
                    if (k.startsWith("sb-")) sessionStorage.removeItem(k);
                  }
                } catch {}

                // IMPORTANT: pass signout=1 so /login does NOT auto-redirect back to /app
                window.location.href = "/login?signout=1";
              }}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </motion.header>

      <div className="ui-container grid gap-6 py-6 md:grid-cols-[260px,1fr]">
        <aside className="ui-card h-fit p-2 md:sticky md:top-[84px]">
          <nav className="grid gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cx(
                  "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-200",
                  "hover:bg-white/[0.06] hover:text-white",
                  pathname === href && "bg-white/[0.06] text-white border border-white/10"
                )}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition group-hover:border-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{label}</span>
              </Link>
            ))}

            {isAdmin ? (
              <Link
                href="/app/admin"
                className={cx(
                  "group mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-200",
                  "hover:bg-white/[0.06] hover:text-white",
                  pathname === "/app/admin" && "bg-white/[0.06] text-white border border-white/10"
                )}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition group-hover:border-white/20">
                  <Shield className="h-4 w-4" />
                </span>
                <span className="font-medium">Admin</span>
              </Link>
            ) : null}
          </nav>
        </aside>

        <motion.main {...contentMotion} className="min-w-0">
          {children}
        </motion.main>
      </div>
    </div>
  );
}
