export class UpstashRedis {
  constructor(private url: string, private token: string) {}

  private async call<T>(parts: (string | number)[]): Promise<T> {
    // Upstash REST API: POST https://<url>/<COMMAND>/<arg1>/<arg2>...
    // Args must be URL-encoded.
    const path =
      "/" +
      parts
        .map((p) => encodeURIComponent(String(p)))
        .join("/");

    const res = await fetch(`${this.url}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    const json = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      throw new Error(`Upstash error ${res.status}: ${JSON.stringify(json)}`);
    }
    return json?.result as T;
  }

  async cmd<T = any>(command: string, ...args: any[]): Promise<T> {
    return this.call<T>([command.toUpperCase(), ...args]);
  }
}
