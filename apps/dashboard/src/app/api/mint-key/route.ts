import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/serverSupabase";

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { agentId } = await req.json();
    if (!agentId) return NextResponse.json({ error: { message: "Missing agentId" } }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    // Validate ownership
    const agent = await supa.from("agents").select("id,user_id").eq("id", agentId).single();
    if (agent.error) return NextResponse.json({ error: { message: "Agent not found" } }, { status: 404 });
    if (agent.data.user_id !== userData.user.id) return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

    // Generate allowance key (show only once)
    const key = `sk_allow_${crypto.randomBytes(24).toString("base64url")}`;
    const pepper = process.env.ALLOWANCE_KEY_PEPPER!;
    const key_hash = sha256Hex(`${pepper}:${key}`);
    const prefix = key.slice(0, 8);

    // Revoke old keys for this agent (optional)
    await supa.from("allowance_keys").update({ revoked_at: new Date().toISOString() }).eq("agent_id", agentId).is("revoked_at", null);

    const { error } = await supa.from("allowance_keys").insert({ agent_id: agentId, key_hash, prefix });
    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    return NextResponse.json({ key });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
