"use client";
import { supabase } from "@/lib/supabaseClient";

export async function authedFetch(input: RequestInfo, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(input, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
