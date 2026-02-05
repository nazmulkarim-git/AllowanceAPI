import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">AllowanceAPI</h1>
      <p className="mt-3 text-gray-700">
        Financial firewall for AI agents: circuit breaker, model gating, velocity caps, and an OpenAI-compatible proxy.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/login" className="rounded-md bg-black px-4 py-2 text-white">Open dashboard</Link>
        <a className="rounded-md border px-4 py-2" href="/docs">Docs</a>
      </div>
    </div>
  );
}
