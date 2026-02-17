import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverSupabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = supabaseAdmin();

  const { data } = await svc
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ data });
}
