import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import { encryptAesGcmToB64 } from "@/lib/cryptoServer";

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: { message: "Missing apiKey" } }, { status: 400 });
    }
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    const encrypted_key = encryptAesGcmToB64(apiKey, process.env.SERVER_ENCRYPTION_KEY_B64!);

    const { error } = await supa.from("provider_keys").upsert({
      user_id: userData.user.id,
      provider: provider ?? "openai",
      encrypted_key,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
