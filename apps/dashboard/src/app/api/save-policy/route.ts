import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import { upstashServer, invalidateAgentCaches } from "@/lib/serverRedis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, policy } = body ?? {};
    if (!agentId || !policy) return NextResponse.json({ error: { message: "Missing agentId/policy" } }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    const agent = await supa.from("agents").select("id,user_id").eq("id", agentId).single();
    if (agent.error) return NextResponse.json({ error: { message: "Agent not found" } }, { status: 404 });
    if (agent.data.user_id !== userData.user.id) return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

    // save policy in DB
    const { error } = await supa.from("agent_policies").upsert({
      agent_id: agentId,
      balance_cents: policy.balance_cents,
      allowed_models: policy.allowed_models,
      circuit_breaker_n: policy.circuit_breaker_n,
      velocity_window_seconds: policy.velocity_window_seconds,
      velocity_cap_cents: policy.velocity_cap_cents,
      webhook_url: policy.webhook_url ?? null,
      webhook_secret: policy.webhook_secret ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    // ---- Redis write-through ----
    const redis = upstashServer();

    // update balance cache instantly
    await redis.cmd("SETEX", `allow:balance:${agentId}`, "86400", String(policy.balance_cents ?? 0));

    // invalidate policy cache for all active keys
    const keys = await supa
      .from("allowance_keys")
      .select("key_hash")
      .eq("agent_id", agentId)
      .is("revoked_at", null);

    const keyHashes = (keys.data ?? []).map((k: any) => k.key_hash).filter(Boolean);
    await invalidateAgentCaches(redis, keyHashes);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
