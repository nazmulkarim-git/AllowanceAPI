import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminServer";
import { upstashServer, invalidateAgentCaches } from "@/lib/serverRedis";

type Action =
  | { type: "freeze"; agentId: string }
  | { type: "unfreeze"; agentId: string }
  | { type: "kill"; agentId: string }
  | { type: "set_balance"; agentId: string; balance_cents: number }
  | {
      type: "set_policy";
      agentId: string;
      policy: {
        allowed_models?: string[];
        circuit_breaker_n?: number;
        velocity_window_seconds?: number;
        velocity_cap_cents?: number;
        webhook_url?: string | null;
        webhook_secret?: string | null;
        balance_cents?: number;
      };
    };

export async function POST(req: Request) {
  try {
    const { svc } = await requireAdminFromRequest(req);
    const body = (await req.json().catch(() => null)) as Action | null;
    if (!body || !(body as any).agentId) return NextResponse.json({ error: { message: "bad_request" } }, { status: 400 });

    const agentId = (body as any).agentId;

    // fetch active key hashes for cache invalidation
    const keys = await svc
      .from("allowance_keys")
      .select("key_hash")
      .eq("agent_id", agentId)
      .is("revoked_at", null);

    const keyHashes = (keys.data ?? []).map((k: any) => k.key_hash).filter(Boolean);
    const redis = upstashServer();

    if (body.type === "freeze") {
      await svc.from("agents").update({ status: "frozen" }).eq("id", agentId);
      await redis.cmd("SETEX", `allow:frozen:${agentId}`, "86400", "1");
      await invalidateAgentCaches(redis, keyHashes);
      return NextResponse.json({ ok: true });
    }

    if (body.type === "unfreeze") {
      await svc.from("agents").update({ status: "active" }).eq("id", agentId);
      await redis.cmd("DEL", `allow:frozen:${agentId}`);
      await invalidateAgentCaches(redis, keyHashes);
      return NextResponse.json({ ok: true });
    }

    if (body.type === "kill") {
      await svc.from("agents").update({ status: "frozen" }).eq("id", agentId);
      await svc.from("agent_policies").update({ balance_cents: 0 }).eq("agent_id", agentId);

      await redis.cmd("SETEX", `allow:bal:${agentId}`, "86400", "0");
      await redis.cmd("SETEX", `allow:frozen:${agentId}`, "86400", "1");
      await invalidateAgentCaches(redis, keyHashes);

      return NextResponse.json({ ok: true });
    }

    if (body.type === "set_balance") {
      const bal = Number((body as any).balance_cents);
      await svc.from("agent_policies").update({ balance_cents: bal }).eq("agent_id", agentId);

      await redis.cmd("SETEX", `allow:bal:${agentId}`, "86400", String(bal));
      await invalidateAgentCaches(redis, keyHashes);

      return NextResponse.json({ ok: true });
    }

    if (body.type === "set_policy") {
      const p = (body as any).policy ?? {};
      const update: any = {
        updated_at: new Date().toISOString(),
      };
      if (p.allowed_models !== undefined) update.allowed_models = p.allowed_models;
      if (p.circuit_breaker_n !== undefined) update.circuit_breaker_n = p.circuit_breaker_n;
      if (p.velocity_window_seconds !== undefined) update.velocity_window_seconds = p.velocity_window_seconds;
      if (p.velocity_cap_cents !== undefined) update.velocity_cap_cents = p.velocity_cap_cents;
      if (p.webhook_url !== undefined) update.webhook_url = p.webhook_url;
      if (p.webhook_secret !== undefined) update.webhook_secret = p.webhook_secret;
      if (p.balance_cents !== undefined) update.balance_cents = p.balance_cents;

      const { error } = await svc.from("agent_policies").update(update).eq("agent_id", agentId);
      if (error) return NextResponse.json({ error: { message: error.message } }, { status: 400 });

      if (p.balance_cents !== undefined) {
        await redis.cmd("SETEX", `allow:bal:${agentId}`, "86400", String(p.balance_cents));
      }
      await invalidateAgentCaches(redis, keyHashes);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: { message: "unknown_action" } }, { status: 400 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg === "forbidden" ? 403 : 401;
    return NextResponse.json({ error: { message: msg } }, { status });
  }
}
