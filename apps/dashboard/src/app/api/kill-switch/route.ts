import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import { upstashServer, invalidateAgentCaches } from "@/lib/serverRedis";

export async function POST(req: Request) {
  try {
    const { agentId } = await req.json();
    if (!agentId) return NextResponse.json({ error: { message: "Missing agentId" } }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    const agent = await supa.from("agents").select("id,user_id").eq("id", agentId).single();
    if (agent.error) return NextResponse.json({ error: { message: "Agent not found" } }, { status: 404 });
    if (agent.data.user_id !== userData.user.id) return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

    // Set balance to 0 and status frozen
    const { error: e1 } = await supa.from("agent_policies").update({ balance_cents: 0, updated_at: new Date().toISOString() }).eq("agent_id", agentId);
    if (e1) return NextResponse.json({ error: { message: e1.message } }, { status: 400 });

    const { error: e2 } = await supa.from("agents").update({ status: "frozen", updated_at: new Date().toISOString() }).eq("id", agentId);
    
    // ---- Redis write-through for instant enforcement ----
    const redis = upstashServer();

    const keys = await supa
      .from("allowance_keys")
      .select("key_hash")
      .eq("agent_id", agentId)
      .is("revoked_at", null);

    const keyHashes = (keys.data ?? []).map((k: any) => k.key_hash).filter(Boolean);

    // force enforcement state
    await redis.cmd("SETEX", `allow:balance:${agentId}`, "86400", "0");
    await redis.cmd("SETEX", `allow:frozen:${agentId}`, "86400", "1");

    await invalidateAgentCaches(redis, keyHashes);
    if (e2) return NextResponse.json({ error: { message: e2.message } }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
