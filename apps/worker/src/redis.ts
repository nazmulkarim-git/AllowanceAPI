export class UpstashRedis {
  constructor(private url: string, private token: string) {}

  async cmd<T>(...args: any[]): Promise<T> {
    const command = String(args[0] ?? "").toUpperCase();
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });

      const json: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 🔥 THIS is what we need: print the exact command + args
        console.log("UPSTASH_FAIL", {
          status: res.status,
          command,
          args,
          upstash: json,
        });
        throw new Error(`Upstash error ${res.status}: ${JSON.stringify(json)}`);
      }

      return json.result as T;
    } catch (e: any) {
      // Also log unexpected failures
      console.log("UPSTASH_EXCEPTION", { command, args, message: String(e?.message ?? e) });
      throw e;
    }
  }
}

  //async cmd<T = any>(command: string, ...args: any[]): Promise<T> {
    //return this.call<T>([command.toUpperCase(), ...args]);
  //}
//}
