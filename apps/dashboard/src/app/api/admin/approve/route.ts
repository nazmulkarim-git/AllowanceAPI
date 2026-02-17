import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import crypto from "crypto";

function generateTempPassword() {
  return crypto.randomBytes(10).toString("base64url");
}
function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    const authHeader = req.headers.get("authorization");
    if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: { message: "Valid email required" } }, { status: 400 });
    }

    const svc = supabaseAdmin();

    const { data: wl, error: wlErr } = await svc
      .from("waitlist")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (wlErr) return NextResponse.json({ error: { message: wlErr.message } }, { status: 500 });
    if (!wl) return NextResponse.json({ error: { message: "Email not found in waitlist" } }, { status: 404 });

    const tempPassword = generateTempPassword();

    const { data: userData, error: userError } = await svc.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (userError) {
      return NextResponse.json({ error: { message: userError.message } }, { status: 500 });
    }

    const userId = userData.user.id;

    // IMPORTANT: ensure profiles row exists (upsert)
    const { error: profErr } = await svc.from("profiles").upsert(
      {
        id: userId,
        email,
        is_admin: false,
        must_change_password: true,
      },
      { onConflict: "id" }
    );
    if (profErr) {
      return NextResponse.json({ error: { message: profErr.message } }, { status: 500 });
    }

    const { error: apprErr } = await svc
      .from("waitlist")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("email", email);
    if (apprErr) {
      return NextResponse.json({ error: { message: apprErr.message } }, { status: 500 });
    }

    // Email temp password
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM || "Forsig <founders@forsig.com>";
    const loginUrl = process.env.PUBLIC_LOGIN_URL || "https://forsig.com/login";

    if (!RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        email_sent: false,
        warning: "RESEND_API_KEY missing. User created, but email not sent.",
        temp_password: tempPassword,
      });
    }

    const subject = "Your Forsig access (temporary password)";
    const text = [
      `Hi,`,
      ``,
      `You're approved for Forsig early access.`,
      ``,
      `Login: ${loginUrl}`,
      `Email: ${email}`,
      `Temporary password: ${tempPassword}`,
      ``,
      `You'll be required to change your password on first login.`,
      ``,
      `— Forsig`,
    ].join("\n");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [email], subject, text }),
    });

    const respText = await resp.text();
    if (!resp.ok) {
      return NextResponse.json(
        {
          error: { message: `Resend failed (${resp.status}).`, details: respText },
          temp_password: tempPassword,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, email_sent: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: String(e?.message || e) } }, { status: 500 });
  }
}
