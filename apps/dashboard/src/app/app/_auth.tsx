// apps/dashboard/src/app/app/_auth.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      if (!data.session) {
        setLoading(false);
        window.location.href = "/login";
        return;
      }

      // Gate on must_change_password
      const userId = data.session.user.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .maybeSingle();

      if (prof?.must_change_password && window.location.pathname !== "/change-password") {
        setLoading(false);
        window.location.href = "/change-password";
        return;
      }

      setLoading(false);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      if (!mounted) return;

      setSession(s);
      if (!s) {
        window.location.href = "/login";
        return;
      }

      const userId = s.user.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .maybeSingle();

      if (prof?.must_change_password && window.location.pathname !== "/change-password") {
        window.location.href = "/change-password";
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session };
}
