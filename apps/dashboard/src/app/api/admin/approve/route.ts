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
    const tempPassword = generateTempPassword();

    let userId: string | null = null;

    // Try creating user first
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createErr) {
      // If user already exists, fetch from listUsers
      if (createErr.message.includes("already registered")) {
        const { data: usersData } = await svc.auth.admin.listUsers();

        const existingUser = usersData?.users?.find(
          (u: any) => u.email?.toLowerCase() === email
        );

        if (!existingUser) {
          return NextResponse.json(
            { error: { message: "User exists but could not fetch from auth" } },
            { status: 500 }
          );
        }

        userId = existingUser.id;

        // Reset password
        const { error: resetErr } = await svc.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
        });

        if (resetErr) {
          return NextResponse.json(
            { error: { message: resetErr.message } },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: { message: createErr.message } },
          { status: 500 }
        );
      }
    } else {
      userId = created.user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: { message: "User ID not resolved" } },
        { status: 500 }
      );
    }

    // Ensure profile exists
    await svc.from("profiles").upsert(
      {
        id: userId,
        email,
        must_change_password: true,
        is_admin: false,
      },
      { onConflict: "id" }
    );

    // Approve waitlist
    await svc.from("waitlist").upsert(
      {
        email,
        status: "approved",
        approved_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    // Send email (optional)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM || "Forsig <founders@forsig.com>";
    const loginUrl = process.env.PUBLIC_LOGIN_URL || "https://forsig.com/login";

    if (!RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        email_sent: false,
        temp_password: tempPassword,
      });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Your Forsig access",
        text: `
You've been approved.

Login: ${loginUrl}
Email: ${email}
Temporary password: ${tempPassword}

You'll be required to change your password on first login.

— Forsig
        `,
      }),
    });

    const respText = await resp.text();

    if (!resp.ok) {
      return NextResponse.json({
        ok: true,
        email_sent: false,
        resend_error: respText,
        temp_password: tempPassword,
      });
    }

    return NextResponse.json({ ok: true, email_sent: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: { message: String(e?.message || e) } },
      { status: 500 }
    );
  }
}
