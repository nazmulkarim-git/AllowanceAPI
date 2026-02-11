import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import { decryptAesGcmFromB64 } from "@/lib/cryptoServer";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: { message: "Missing auth" } }, { status: 401 });

    const supa = supabaseAdmin();
    const { data: userData, error: userErr } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return NextResponse.json({ error: { message: "Invalid auth" } }, { status: 401 });

    const serverKey = process.env.SERVER_ENCRYPTION_KEY_B64;
    if (!serverKey) {
      return NextResponse.json(
        { error: { message: "Server misconfigured: missing SERVER_ENCRYPTION_KEY_B64" } },
        { status: 500 }
      );
    }

    // Load encrypted OpenAI key for this user
    const { data: rows, error } = await supa
      .from("provider_keys")
      .select("encrypted_key")
      .eq("user_id", userData.user.id)
      .eq("provider", "openai")
      .limit(1);

    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

    const encryptedKey = rows?.[0]?.encrypted_key;
    if (!encryptedKey) return NextResponse.json({ error: { message: "No OpenAI key saved" } }, { status: 400 });

    const openaiKey = decryptAesGcmFromB64(encryptedKey, serverKey);

    const base = process.env.OPENAI_API_BASE || "https://api.openai.com";
    const upstream = await fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${openaiKey}` },
    });

    const json = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: { message: json?.error?.message ?? `OpenAI error ${upstream.status}` } },
        { status: upstream.status }
      );
    }

    const models: string[] = (json?.data ?? [])
      .map((m: any) => m?.id)
      .filter((x: any) => typeof x === "string")
      .sort();

    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message ?? "Error" } }, { status: 500 });
  }
}
