import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";

export async function POST(req: Request) {
  try {
    const { agentId, status } = await req.json();
    if (!agentId || !status) return NextResponse.json({ error: { message: "Missing agentId/status" } }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    const agent = await supa.from("agents").select("id,user_id").eq("id", agentId).single();
    if (agent.error) return NextResponse.json({ error: { message: "Agent not found" } }, { status: 404 });
    if (agent.data.user_id !== userData.user.id) return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

    const nextStatus = status === "active" ? "active" : "frozen";
    const { error } = await supa.from("agents").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", agentId);
    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
