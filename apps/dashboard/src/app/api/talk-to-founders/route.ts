// apps/dashboard/src/app/api/talk-to-founders/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = body?.phone ? String(body.phone).trim() : "";
    const company = body?.company ? String(body.company).trim() : "";
    const role = body?.role ? String(body.role).trim() : "";
    const monthly_spend = body?.monthly_spend ? String(body.monthly_spend).trim() : "";
    const message = String(body?.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: { message: "Name, email, and message are required." } },
        { status: 400 }
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { error: { message: "Please enter a valid email." } },
        { status: 400 }
      );
    }

    // Store inquiry (optional but useful)
    const svc = supabaseAdmin();
    await svc.from("founder_inquiries").insert({
      name,
      email,
      phone,
      company,
      role,
      monthly_spend,
      message,
    });

    // Send email via Resend (no dependency)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.FOUNDERS_INBOX || "thenazmulkarim@gmail.com";
    const FROM = process.env.RESEND_FROM || "Forsig <founders@forsig.com>";

    if (!RESEND_API_KEY) {
      // Still ok: inquiry saved in DB, but email won't send
      return NextResponse.json({
        ok: true,
        warning: "RESEND_API_KEY not set; saved inquiry but did not email.",
      });
    }

    const subject = `Forsig — Founder inquiry from ${name}${company ? ` (${company})` : ""}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      company ? `Company: ${company}` : null,
      role ? `Role: ${role}` : null,
      monthly_spend ? `Monthly spend: ${monthly_spend}` : null,
      "",
      "Message:",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject,
        text,
        reply_to: email,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: { message: `Email send failed: ${errText}` } },
        { status: 502 }
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
