import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminServer";

export async function GET(req: Request) {
  try {
    const { svc } = await requireAdminFromRequest(req);
    const { data, error } = await svc
      .from("profiles")
      .select("id,email,is_admin,created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg === "forbidden" ? 403 : 401;
    return NextResponse.json({ error: { message: msg } }, { status });
  }
}
