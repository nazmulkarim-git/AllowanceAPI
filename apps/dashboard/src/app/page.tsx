"use client";

import Link from "next/link";
import { Code2, ShieldCheck, Gauge, KeyRound, LineChart, ArrowRight, Check } from "lucide-react";

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="ui-pill w-fit">{children}</div>;
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-container py-14 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        {eyebrow ? <Pill>{eyebrow}</Pill> : null}
        <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-3 text-base leading-7 text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="ui-code overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Code2 className="h-4 w-4" />
          {title}
        </div>
        <span className="ui-pill">copy-paste</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Page() {
  const oneLine = `import { Forsig } from "@forsig/sdk";

const forsig = new Forsig({ allowanceKey: process.env.FORSIG_KEY });

await forsig.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Summarize this ticket…" }],
});`;

  const policy = `{
  "budget_cents": 3000,
  "velocity_window_seconds": 10,
  "velocity_cap_cents": 20,
  "allowed_models": ["o3-mini", "gpt-4o-mini"],
  "circuit_breaker_n": 6
}`;

  return (
    <main className="relative">
      {/* Background composition */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.35]" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur">
        <div className="ui-container flex items-center justify-between py-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <ShieldCheck className="h-4 w-4 text-zinc-100" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-zinc-100">Forsig</div>
              <div className="text-[11px] text-zinc-400">Policy-first AI gateway</div>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-2">
            <a className="ui-btn" href="#product">
              Product
            </a>
            <a className="ui-btn" href="#pricing">
              Pricing
            </a>
            <Link className="ui-btn" href="/docs">
              Docs
            </Link>
          </nav>

          <Link className="ui-btn ui-btn-primary" href="/login">
            Open dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="ui-container pt-10 sm:pt-14">
        <div className="ui-hero">
          <div className="ui-glow" />
          <div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0">
              <Pill>
                <ShieldCheck className="h-3.5 w-3.5" />
                Budgets • Velocity caps • Audit trail • Kill switch
              </Pill>

              <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                Make agent spend predictable.
                <span className="block text-zinc-300">Without slowing teams down.</span>
              </h1>

              <p className="mt-4 text-base leading-7 text-zinc-400 max-w-xl">
                Forsig enforces policy between your app and model providers. Mint scoped allowance keys, stop runaway spend
                with velocity caps, and get an audit-grade ledger for every request.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link className="ui-btn ui-btn-primary px-5" href="/login">
                  Launch dashboard <ArrowRight className="h-4 w-4" />
                </Link>
                <a className="ui-btn px-5" href="#product">
                  See how it works
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 max-w-xl">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-lg font-semibold text-white">1 line</div>
                  <div className="mt-1 text-xs text-zinc-400">Drop-in enforcement</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-lg font-semibold text-white">Reserve → settle</div>
                  <div className="mt-1 text-xs text-zinc-400">Exact usage accounting</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-lg font-semibold text-white">Instant</div>
                  <div className="mt-1 text-xs text-zinc-400">Freeze & revoke keys</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <CodeCard title="one line to enforce spend" code={oneLine} />
              <CodeCard title="policy in one object" code={policy} />
              <div className="text-xs text-zinc-500">
                Works with OpenAI-compatible calls — enforcement travels with the allowance key.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product */}
      <Section
        eyebrow="Product"
        title="A control plane for agent spend"
        subtitle="Everything you need to ship safely: scoped keys, predictable budgets, and audit-ready logs."
      >
        <div id="product" className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: <KeyRound className="h-5 w-5 text-white" />,
              title: "Allowance keys",
              desc: "Scope budgets + model constraints into keys. Rotate and revoke instantly.",
              bullets: ["Key prefixes for safe sharing", "Per-agent policies", "Revocation on demand"],
            },
            {
              icon: <Gauge className="h-5 w-5 text-white" />,
              title: "Budgets + velocity caps",
              desc: "Stop runaway spend with preflight checks, rate limits, and circuit breakers.",
              bullets: ["Spend caps", "Velocity windows", "Circuit breaker (N)"],
            },
            {
              icon: <LineChart className="h-5 w-5 text-white" />,
              title: "Audit-grade logs",
              desc: "See spend, request counts, tokens, and model breakdowns — ready for ops and finance.",
              bullets: ["Per-model spend", "Token breakdowns", "Export-ready reporting"],
            },
          ].map((f) => (
            <div key={f.title} className="ui-card ui-card-hover p-6">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-400">{f.desc}</div>

                  <div className="mt-4 grid gap-2">
                    {f.bullets.map((b) => (
                      <div key={b} className="flex items-center gap-2 text-xs text-zinc-300">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section
        eyebrow="Pricing"
        title="Start simple. Scale with confidence."
        subtitle="Self-serve to begin — upgrade when you’re scaling workloads and ops needs."
      >
        <div id="pricing" className="grid gap-4 lg:grid-cols-2">
          <div className="ui-card ui-card-hover p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Starter</div>
                <div className="mt-1 text-sm text-zinc-400">For prototypes and early production.</div>
              </div>
              <span className="ui-pill">self-serve</span>
            </div>
            <div className="mt-6 text-3xl font-semibold text-white">$0</div>
            <div className="mt-1 text-sm text-zinc-500">Ship safely with core controls.</div>
            <div className="mt-6 grid gap-2">
              {["Allowance keys", "Budgets + velocity caps", "Audit logs", "Freeze controls"].map((x) => (
                <div key={x} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4" />
                  <span>{x}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link className="ui-btn ui-btn-primary w-full" href="/login">
                Launch dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="ui-card ui-card-hover p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Team</div>
                <div className="mt-1 text-sm text-zinc-400">For companies scaling agent workloads.</div>
              </div>
              <span className="ui-pill">contact</span>
            </div>
            <div className="mt-6 text-3xl font-semibold text-white">Custom</div>
            <div className="mt-1 text-sm text-zinc-500">SSO, higher limits, and production support.</div>
            <div className="mt-6 grid gap-2">
              {["Role-based access", "Exports & reporting", "SLA + support", "Deployment guidance"].map((x) => (
                <div key={x} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4" />
                  <span>{x}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <a className="ui-btn ui-btn-primary w-full" href="mailto:thenazmulkarim@gmail.com.com">
                Talk to founders <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row">
          <div>© {new Date().getFullYear()} Forsig</div>
          <div className="flex items-center gap-4">
            <Link className="hover:text-zinc-300" href="/docs">
              Docs
            </Link>
            <a className="hover:text-zinc-300" href="mailto:founders@forsig.com">
              Contact
            </a>
          </div>
        </footer>
      </Section>
    </main>
  );
}
