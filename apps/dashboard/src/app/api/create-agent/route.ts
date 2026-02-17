import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

    const { name } = await req.json();
    const agentName = String(name || "").trim();
    if (!agentName) return NextResponse.json({ error: "missing_name" }, { status: 400 });

    // Verify user identity from token
    const anon = supabaseAnon();
    const { data: u, error: uerr } = await anon.auth.getUser(token);
    if (uerr || !u?.user?.id) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const userId = u.user.id;
    const svc = supabaseService();

    // Create agent
    const { data: agent, error: aerr } = await svc
      .from("agents")
      .insert({ name: agentName, user_id: userId, status: "active" })
      .select("id")
      .single();

    if (aerr) return NextResponse.json({ error: aerr.message }, { status: 400 });

    // Create default policy
    const { error: perr } = await svc.from("agent_policies").insert({
      agent_id: agent.id,
      balance_cents: 200,
      allowed_models: [],
      circuit_breaker_n: 10,
      velocity_window_seconds: 3600,
      velocity_cap_cents: 50,
    });

    if (perr) {
      // Rollback agent if policy insert fails
      await svc.from("agents").delete().eq("id", agent.id);
      return NextResponse.json({ error: perr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, agent_id: agent.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
