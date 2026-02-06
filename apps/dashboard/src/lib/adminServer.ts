import { createClient } from "@supabase/supabase-js";

export function supabaseService() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function requireAdminFromRequest(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("missing_token");

  // verify caller identity using anon client (safe)
  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } });

  const { data: u, error } = await anon.auth.getUser(token);
  if (error || !u?.user) throw new Error("invalid_token");

  const svc = supabaseService();
  const { data: profile, error: perr } = await svc
    .from("profiles")
    .select("is_admin")
    .eq("id", u.user.id)
    .single();

  if (perr) throw new Error("admin_check_failed");
  if (!profile?.is_admin) throw new Error("forbidden");

  return { userId: u.user.id, svc };
}
