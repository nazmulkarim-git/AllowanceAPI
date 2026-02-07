"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut, LayoutGrid, Settings, Shield } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
  const headerMotion = useMemo(
    () =>
      reduce
        ? {}
        : {
            initial: { y: -8, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            transition: { duration: 0.35, ease: "easeOut" as const },
          },
    [reduce]
  );

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[0.22]" />
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-black/10 blur-3xl" />
        <div className="absolute -right-48 top-24 h-[560px] w-[560px] rounded-full bg-black/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-neutral-50 to-transparent" />
      </div>

      <motion.header
        {...headerMotion}
        className="sticky top-0 z-20 border-b border-black/10 bg-white/70 backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-black text-white">
              F
            </span>
            <span>Forsig</span>
            <span className="hidden rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-black/60 sm:inline-flex">
              Dashboard
            </span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm md:flex">
            <Link
              href="/app"
              className={cx(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-black/70 hover:bg-black/5 hover:text-black"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Agents
            </Link>
            <Link
              href="/app/settings"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-black/70 hover:bg-black/5 hover:text-black"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            {isAdmin ? (
              <Link
                href="/app/admin"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-black/70 hover:bg-black/5 hover:text-black"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            {userEmail ? (
              <span className="hidden max-w-[240px] truncate text-xs font-medium text-black/50 sm:inline">
                {userEmail}
              </span>
            ) : null}
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-semibold text-black/80 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="border-t border-black/10 bg-white/60 md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm">
            <Link
              href="/app"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 font-medium text-black/70 hover:bg-black/5 hover:text-black"
            >
              <LayoutGrid className="h-4 w-4" />
              Agents
            </Link>
            <Link
              href="/app/settings"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 font-medium text-black/70 hover:bg-black/5 hover:text-black"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            {isAdmin ? (
              <Link
                href="/app/admin"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 font-medium text-black/70 hover:bg-black/5 hover:text-black"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
