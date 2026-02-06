import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminServer";

export async function GET(req: Request) {
  try {
    const { svc } = await requireAdminFromRequest(req);

    const { data, error } = await svc
      .from("agents")
      .select(`
        id,user_id,name,status,created_at,
        agent_policies (
          balance_cents,allowed_models,circuit_breaker_n,velocity_window_seconds,velocity_cap_cents,webhook_url,webhook_secret
        )
      `)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });

    const rows = (data ?? []).map((a: any) => ({
      ...a,
      ...(Array.isArray(a.agent_policies) ? a.agent_policies[0] : a.agent_policies ?? {}),
    }));

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg === "forbidden" ? 403 : 401;
    return NextResponse.json({ error: { message: msg } }, { status });
  }
}
