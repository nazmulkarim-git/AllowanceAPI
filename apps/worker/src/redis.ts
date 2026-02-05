export class UpstashRedis {
  constructor(private url: string, private token: string) {}

  private async req<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.url}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : "[]",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash error ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async cmd<T = any>(command: string, ...args: any[]): Promise<T> {
    // Upstash REST expects ["CMD","arg1",...]
    const payload = [command, ...args];
    const out = await this.req<{ result: T }>("/execute", payload);
    return out.result;
  }
}
