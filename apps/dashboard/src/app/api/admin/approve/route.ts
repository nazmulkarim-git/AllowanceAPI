// apps/dashboard/src/app/api/admin/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import crypto from "crypto";

function generateTempPassword() {
  return crypto.randomBytes(8).toString("hex"); // 16 char secure password
}

export async function POST(req: Request) {
  try {
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM || "Forsig <founders@forsig.com>";

    const authHeader = req.headers.get("authorization");
    if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { error: { message: "Email required" } },
        { status: 400 }
      );
    }

    const svc = supabaseAdmin();

    // Check waitlist entry
    const { data: wl } = await svc
      .from("waitlist")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!wl) {
      return NextResponse.json(
        { error: { message: "Email not found in waitlist" } },
        { status: 404 }
      );
    }

    const tempPassword = generateTempPassword();

    // Create Supabase Auth user
    const { data: userData, error: userError } =
      await svc.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (userError) {
      return NextResponse.json(
        { error: { message: userError.message } },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    // Update profile flag
    await svc.from("profiles").update({
      must_change_password: true,
    }).eq("id", userId);

    // Mark waitlist approved
    await svc.from("waitlist").update({
      status: "approved",
      approved_at: new Date().toISOString(),
    }).eq("email", email);

    // Send email with temp password
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: "Your Forsig Access",
          text: `
Hi,

You've been approved for early access to Forsig.

Login: https://forsig.com/login
Email: ${email}
Temporary Password: ${tempPassword}

You will be required to change your password on first login.

— Forsig Team
          `,
        }),
      });
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: { message: String(e?.message || e) } },
      { status: 500 }
    );
  }
}
