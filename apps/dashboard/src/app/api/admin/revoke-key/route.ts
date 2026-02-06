import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminServer";
import { upstashServer } from "@/lib/serverRedis";

export async function POST(req: Request) {
  try {
    const { svc } = await requireAdminFromRequest(req);
    const { key_hash } = await req.json();
    if (!key_hash) return NextResponse.json({ error: { message: "missing_key_hash" } }, { status: 400 });

    const { data, error } = await svc
      .from("allowance_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("key_hash", key_hash)
      .select("agent_id")
      .single();

    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    // also clear key→agent cache so it can't be used until revalidated
    const redis = upstashServer();
    await redis.cmd("DEL", `allow:key:${key_hash}`);

    // optionally freeze agent immediately
    if (data?.agent_id) await redis.cmd("SETEX", `allow:frozen:${data.agent_id}`, "86400", "1");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg === "forbidden" ? 403 : 401;
    return NextResponse.json({ error: { message: msg } }, { status });
  }
}
