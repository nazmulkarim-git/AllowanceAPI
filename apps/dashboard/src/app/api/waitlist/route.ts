// apps/dashboard/src/app/api/waitlist/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;
    const company = body?.company ? String(body.company).trim() : null;

    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { error: { message: "Please enter a valid email." } },
        { status: 400 }
      );
    }

    const svc = supabaseAdmin();

    // Upsert by email (idempotent)
    const { error } = await svc
      .from("waitlist")
      .upsert(
        { email, name, company, status: "pending" },
        { onConflict: "email" }
      );

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: { message: String(e?.message || e) } },
      { status: 500 }
    );
  }
}
