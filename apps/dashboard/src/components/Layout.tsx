import Link from "next/link";
import { ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Layout({ children, userEmail, isAdmin }: { children: ReactNode; userEmail?: string; isAdmin?: boolean }) {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" className="font-semibold">AllowanceAPI</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app" className="hover:underline">Agents</Link>
            <Link href="/app/settings" className="hover:underline">Settings</Link>
            {isAdmin ? <Link href="/app/admin" className="hover:underline">Admin</Link> : null}
            <span className="text-gray-500">{userEmail}</span>
            <button onClick={signOut} className="rounded-md border px-3 py-1 hover:bg-gray-100">Sign out</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
