import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import { upstashServer, invalidateAgentCaches } from "@/lib/serverRedis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const agentId = body.agentId;

    // Accept either {status:"active"|"frozen"} OR {freeze:true|false}
    const status =
      typeof body.status === "string"
        ? body.status
        : typeof body.freeze === "boolean"
          ? (body.freeze ? "frozen" : "active")
          : null;

    if (!agentId || !status) {
      return NextResponse.json(
        { error: { message: "Missing agentId and status (or freeze boolean)" } },
        { status: 400 }
      );
    }

    if (status !== "active" && status !== "frozen") {
      return NextResponse.json(
        { error: { message: "Invalid status" } },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    const agent = await supa.from("agents").select("id,user_id").eq("id", agentId).single();
    if (agent.error) return NextResponse.json({ error: { message: "Agent not found" } }, { status: 404 });
    if (agent.data.user_id !== userData.user.id) return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

    const nextStatus = status;
    const { error } = await supa.from("agents").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", agentId);

    // ---- Redis write-through for instant enforcement ----
    const redis = upstashServer();

    // get active key hashes for this agent so we can invalidate policy cache
    const keys = await supa
      .from("allowance_keys")
      .select("key_hash")
      .eq("agent_id", agentId)
      .is("revoked_at", null);

    const keyHashes = (keys.data ?? []).map((k: any) => k.key_hash).filter(Boolean);

      if (nextStatus === "frozen") {
        await redis.cmd("SETEX", `allow:frozen:${agentId}`, "86400", "1");
      } else {
        await redis.cmd("DEL", `allow:frozen:${agentId}`);
      }

    await invalidateAgentCaches(redis, keyHashes);

    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
