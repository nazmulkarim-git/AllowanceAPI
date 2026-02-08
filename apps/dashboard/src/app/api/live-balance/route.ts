import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import { upstashServer } from "@/lib/serverRedis";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId") || "";
    if (!agentId) {
      return NextResponse.json({ error: { message: "Missing agentId" } }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });
    }

    const supa = supabaseAdmin();
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });
    }

    // Ownership check
    const agent = await supa.from("agents").select("id,user_id").eq("id", agentId).single();
    if (agent.error || !agent.data) {
      return NextResponse.json({ error: { message: "Agent not found" } }, { status: 404 });
    }
    if (agent.data.user_id !== userData.user.id) {
      return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
    }

    const redis = upstashServer();
    const [balRaw, velRaw, frozenRaw] = await Promise.all([
      redis.cmd<string | null>("GET", `allow:balance:${agentId}`),
      redis.cmd<string | null>("GET", `allow:velocity:${agentId}`),
      redis.cmd<string | null>("GET", `allow:frozen:${agentId}`),
    ]);

    return NextResponse.json({
      balance_cents: Number(balRaw ?? 0),
      velocity_cents: Number(velRaw ?? 0),
      frozen: !!frozenRaw,
    });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
