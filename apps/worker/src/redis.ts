export class UpstashRedis {
  constructor(private url: string, private token: string) {}

  private async call<T>(parts: (string | number)[]): Promise<T> {
    const path = "/" + parts.map((p) => encodeURIComponent(String(p))).join("/");

    const attempt = async (): Promise<T> => {
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 5000); // 5s

      try {
        const res = await fetch(`${this.url}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          signal: ac.signal,
        });

        const json = (await res.json().catch(() => ({}))) as any;

        if (!res.ok) {
          throw new Error(`Upstash error ${res.status}: ${JSON.stringify(json)}`);
        }

        return json?.result as T;
      } finally {
        clearTimeout(timeout);
      }
    };

    let lastErr: any = null;
    for (let i = 0; i < 3; i++) {
      try {
        return await attempt();
      } catch (e) {
        lastErr = e;
        // backoff: 200ms, 400ms, 600ms
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
      }
    }

    throw lastErr;
  }

  async cmd<T = any>(command: string, ...args: any[]): Promise<T> {
    return this.call<T>([command.toUpperCase(), ...args]);
  }
}
