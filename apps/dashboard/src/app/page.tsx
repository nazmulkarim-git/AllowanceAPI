// apps/dashboard/src/app/page.tsx
"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Gauge,
  KeyRound,
  LineChart,
  Zap,
  Lock,
  Eye,
  Check,
  Code2,
} from "lucide-react";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="ui-pill">{children}</div>;
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <div className="mx-auto w-fit">
          <Pill>{eyebrow}</Pill>
        </div>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-base leading-7 text-zinc-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-400">{label}</div>
    </div>
  );
}

function CodePanel({ title, code }: { title: string; code: string }) {
  return (
    <div className="ui-code overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Code2 className="h-4 w-4" />
          {title}
        </div>
        <span className="ui-pill">one line</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function NumberedFeature({
  n,
  title,
  desc,
  icon,
}: {
  n: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="ui-card ui-card-hover p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-widest text-zinc-500">
            {n}
          </div>
          <div className="mt-2 text-sm font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">{desc}</div>
        </div>
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniLogo({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">
      {name}
    </div>
  );
}

export default function Page() {
  const code = `import { Forsig } from "@forsig/sdk";

const forsig = new Forsig({
  allowanceKey: process.env.FORSIG_KEY,
});

await forsig.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Summarize this ticket…" }],
});`;

  return (
    <main className="relative">
      {/* Premium backdrop (Salus: clean, Zion: grid, Sentrial: calm) */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.35]" />

      {/* Header (Zion-like minimal nav) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur">
        <div className="ui-container flex items-center justify-between py-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <ShieldCheck className="h-4 w-4 text-zinc-100" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-zinc-100">
                Forsig
              </div>
              <div className="text-[11px] text-zinc-400">
                Allowance-native AI gateway
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
            <a className="ui-btn" href="#how">
              How it works
            </a>
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

      {/* HERO (Zion: bold headline + code, Salus: validate/guardrails positioning) */}
      <section className="ui-container pt-10 sm:pt-14">
        <div className="ui-hero">
          <div className="ui-glow" />
          <div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0">
              <Pill>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  System Operational
                </span>
                <span className="mx-2 text-zinc-600">•</span>
                Budgets • Velocity caps • Audit trail • Kill switch
              </Pill>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Make AI spend predictable.
                <span className="block text-zinc-300">
                  Guardrails before execution.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
                Forsig sits between your app and model providers. Issue allowance
                keys, enforce budgets and velocity caps at runtime, and get
                audit-ready logs — without changing how your team builds.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link className="ui-btn ui-btn-primary px-5" href="/login">
                  Launch dashboard <ArrowRight className="h-4 w-4" />
                </Link>
                <a className="ui-btn px-5" href="#how">
                  See how it works
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Stat value="1 line" label="Drop-in enforcement" />
                <Stat value="Reserve → settle" label="Exact usage accounting" />
                <Stat value="Instant" label="Freeze & revoke keys" />
              </div>

              <div className="mt-6 text-xs text-zinc-500">
                Built for production agent workflows: predictable cost, safer
                actions, and faster incident response.
              </div>
            </div>

            <div className="grid gap-3">
              <CodePanel title="one line to enforce spend" code={code} />
              <div className="ui-card p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">
                    Works with your stack
                  </div>
                  <span className="ui-pill">OpenAI-compatible</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MiniLogo name="OpenAI" />
                  <MiniLogo name="Anthropic" />
                  <MiniLogo name="LangChain" />
                  <MiniLogo name="LangGraph" />
                  <MiniLogo name="Vercel" />
                  <MiniLogo name="Supabase" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (Zion: “sits between” diagram, Sentrial: production framing) */}
      <section id="how" className="ui-container py-14 sm:py-20">
        <SectionHeader
          eyebrow="How it works"
          title="Forsig enforces policy between your app and the model provider"
          subtitle="Preflight spend + tool policies, execute safely, then settle exact usage for reporting and control."
        />

        <div className="mt-10 ui-card p-6 sm:p-8">
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              {
                t: "Your app",
                d: "You call the model as usual.",
                icon: <Zap className="h-5 w-5 text-white" />,
              },
              {
                t: "Forsig gateway",
                d: "Preflight budgets, velocity, allowlists.",
                icon: <Gauge className="h-5 w-5 text-white" />,
              },
              {
                t: "Model provider",
                d: "Request executes using your provider.",
                icon: <KeyRound className="h-5 w-5 text-white" />,
              },
              {
                t: "Audit trail",
                d: "Settle exact tokens and cost breakdowns.",
                icon: <LineChart className="h-5 w-5 text-white" />,
              },
            ].map((s) => (
              <div
                key={s.t}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  {s.icon}
                </div>
                <div className="text-sm font-semibold text-white">{s.t}</div>
                <div className="mt-1 text-sm leading-6 text-zinc-400">
                  {s.d}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-400">
              Key idea: enforcement travels with the{" "}
              <span className="text-zinc-200">allowance key</span>.
            </div>
            <div className="flex flex-wrap gap-2">
              {["Budgets", "Velocity caps", "Model allowlist", "Freeze", "Kill switch"].map(
                (x) => (
                  <span key={x} className="ui-pill">
                    {x}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT (Salus: numbered product blocks) */}
      <section id="product" className="ui-container py-14 sm:py-20">
        <SectionHeader
          eyebrow="Our product"
          title="Runtime guardrails for cost and control"
          subtitle="The simplest path to safer agents: enforce at runtime, respond instantly, and understand every request."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <NumberedFeature
            n="01"
            title="Runtime enforcement"
            desc="Intercept every request and verify it against budgets, velocity caps, and allowlists before it runs."
            icon={<ShieldCheck className="h-5 w-5 text-white" />}
          />
          <NumberedFeature
            n="02"
            title="Instant operator controls"
            desc="Freeze an agent immediately when you see anomalies — or flip the kill switch during an incident."
            icon={<Lock className="h-5 w-5 text-white" />}
          />
          <NumberedFeature
            n="03"
            title="Allowance keys"
            desc="Issue scoped keys that carry policy with them. Rotate keys safely, revoke instantly, and share prefixes."
            icon={<KeyRound className="h-5 w-5 text-white" />}
          />
          <NumberedFeature
            n="04"
            title="Full visibility"
            desc="Audit-grade logs: spend, request counts, tokens, and model breakdowns — ready for ops and finance."
            icon={<Eye className="h-5 w-5 text-white" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="ui-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  Built for production
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Strong defaults + predictable controls — without dashboard bloat.
                </div>
              </div>
              <span className="ui-pill">ops-ready</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { v: "Preflight", l: "Block early if policy fails" },
                { v: "Exact settle", l: "No guessing on usage" },
                { v: "Audit trail", l: "Per-model breakdowns" },
              ].map((m) => (
                <div
                  key={m.v}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="text-sm font-semibold text-white">{m.v}</div>
                  <div className="mt-1 text-xs text-zinc-400">{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ui-card p-6 sm:p-8">
            <div className="text-sm font-semibold text-white">
              Developer-friendly
            </div>
            <div className="mt-2 text-sm leading-6 text-zinc-400">
              Minimal surface area. Policies live with keys. Integrate once, then
              enforce everywhere.
            </div>
            <div className="mt-6 grid gap-2">
              {[
                "OpenAI-compatible interface",
                "Works with your existing SDK",
                "No rewrite required",
                "Policies per agent",
              ].map((x) => (
                <div key={x} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {x}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link className="ui-btn ui-btn-primary w-full" href="/login">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING (Zion: simple pricing grid) */}
      <section id="pricing" className="ui-container py-14 sm:py-20">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          subtitle="Start self-serve. Upgrade when you’re scaling workloads and ops needs."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="ui-card ui-card-hover p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Starter</div>
                <div className="mt-1 text-sm text-zinc-400">
                  For prototypes and early production.
                </div>
              </div>
              <span className="ui-pill">self-serve</span>
            </div>

            <div className="mt-6 text-3xl font-semibold text-white">$0</div>
            <div className="mt-1 text-sm text-zinc-500">
              Core controls to ship safely.
            </div>

            <div className="mt-6 grid gap-2">
              {["Allowance keys", "Budgets + velocity caps", "Audit logs", "Freeze controls"].map(
                (x) => (
                  <div key={x} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4" />
                    <span>{x}</span>
                  </div>
                )
              )}
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
                <div className="mt-1 text-sm text-zinc-400">
                  For companies scaling agent workloads.
                </div>
              </div>
              <span className="ui-pill">contact</span>
            </div>

            <div className="mt-6 text-3xl font-semibold text-white">Custom</div>
            <div className="mt-1 text-sm text-zinc-500">
              Higher limits, support, and production ops help.
            </div>

            <div className="mt-6 grid gap-2">
              {["Role-based access", "Exports & reporting", "SLA + support", "Deployment guidance"].map(
                (x) => (
                  <div key={x} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4" />
                    <span>{x}</span>
                  </div>
                )
              )}
            </div>

            <div className="mt-8">
              <a className="ui-btn ui-btn-primary w-full" href="mailto:founders@forsig.com">
                Talk to founders <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Final CTA (Salus-style) */}
        <div className="mt-10 ui-card p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-white">
                Ready to ship safer agents?
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Set budgets, mint allowance keys, and enforce guardrails at runtime —
                with audit logs your team can trust.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="ui-btn ui-btn-primary px-6" href="/login">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a className="ui-btn px-6" href="mailto:founders@forsig.com">
                Email founders@forsig.com
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
            <a className="hover:text-zinc-300" href="mailto:thenazmulkarim@gmail.com.com">
              Contact
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}
