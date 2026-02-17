import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";
import crypto from "crypto";

function generateTempPassword() {
  return crypto.randomBytes(10).toString("base64url");
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isAlreadyRegisteredError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    /already.*register/.test(msg) || // matches: already registered / already been registered
    code === "email_exists" ||
    code === "user_already_exists"
  );
}

async function findUserIdByEmail(svc: ReturnType<typeof supabaseAdmin>, email: string) {
  // listUsers is paginated; search a few pages safely
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await (svc.auth.admin as any).listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const found = data?.users?.find((u: any) => String(u.email || "").toLowerCase() === email);
    if (found?.id) return found.id;

    if (!data?.users?.length || data.users.length < 1000) break; // no more pages
  }
  return null;
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

    // 1) Try create user
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createErr) {
      // 2) If user already exists, find them & reset password
      if (isAlreadyRegisteredError(createErr)) {
        userId = await findUserIdByEmail(svc, email);

        if (!userId) {
          return NextResponse.json(
            { error: { message: "User exists in auth but could not locate via listUsers()." } },
            { status: 500 }
          );
        }

        const { error: resetErr } = await svc.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
        });

        if (resetErr) {
          return NextResponse.json({ error: { message: resetErr.message } }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: { message: createErr.message } }, { status: 500 });
      }
    } else {
      userId = created.user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: { message: "User ID not resolved" } }, { status: 500 });
    }

    // Ensure profile exists (server role bypasses RLS)
    await svc.from("profiles").upsert(
      {
        id: userId,
        email,
        must_change_password: true,
        is_admin: false,
      },
      { onConflict: "id" }
    );

    // Approve waitlist row
    await svc.from("waitlist").upsert(
      {
        email,
        status: "approved",
        approved_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    // Send email (Resend)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM || "Forsig <founders@forsig.com>";
    const loginUrl = process.env.PUBLIC_LOGIN_URL || "https://forsig.com/login";

    // If Resend not configured, still succeed, return temp password for debugging
    if (!RESEND_API_KEY) {
      return NextResponse.json({ ok: true, email_sent: false, temp_password: tempPassword });
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
        text: `You've been approved.

Login: ${loginUrl}
Email: ${email}
Temporary password: ${tempPassword}

You'll be required to change your password on first login.

— Forsig`,
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
