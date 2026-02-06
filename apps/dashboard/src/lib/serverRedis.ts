// apps/dashboard/src/lib/serverRedis.ts
export class UpstashRedisServer {
  constructor(private url: string, private token: string) {}

  private async call<T>(parts: (string | number)[]): Promise<T> {
    const path = "/" + parts.map((p) => encodeURIComponent(String(p))).join("/");

    const attempt = async (): Promise<T> => {
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 15000); // 15s (more reliable)
      try {
        const res = await fetch(`${this.url}${path}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.token}` },
          signal: ac.signal,
        });

        const json = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(`Upstash error ${res.status}: ${JSON.stringify(json)}`);
        return json?.result as T;
      } finally {
        clearTimeout(timeout);
      }
    };

    let lastErr: any = null;
    for (let i = 0; i < 4; i++) {
      try {
        return await attempt();
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
    throw lastErr;
  }

  cmd<T = any>(command: string, ...args: any[]) {
    return this.call<T>([command.toUpperCase(), ...args]);
  }
}

export function upstashServer() {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  return new UpstashRedisServer(url, token);
}

// invalidate policy cache for all active keys of an agent
export async function invalidateAgentCaches(redis: UpstashRedisServer, keyHashes: string[]) {
  for (const h of keyHashes) {
    await redis.cmd("DEL", `allow:policy:${h}`);
  }
}
