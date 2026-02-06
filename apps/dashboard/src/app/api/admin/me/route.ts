import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminServer";

export async function GET(req: Request) {
  try {
    await requireAdminFromRequest(req);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg === "forbidden" ? 403 : 401;
    return NextResponse.json({ error: { message: msg } }, { status });
  }
}
