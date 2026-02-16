"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Shield, Gauge, KeyRound, LineChart, Check, Code2, Sparkles } from "lucide-react";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function SectionTitle({
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
        <div className="ui-pill mx-auto w-fit">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="ui-card p-6">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-zinc-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="ui-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Code2 className="h-4 w-4" />
          one line to enforce spend
        </div>
        <span className="ui-pill">server.ts</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-zinc-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function LandingPage() {
  const snippet = useMemo(
    () => `import { Forsig } from "@forsig/sdk";

const forsig = new Forsig({ allowanceKey: process.env.FORSIG_KEY });

const res = await forsig.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Summarize this ticket…" }],
});`,
    []
  );

  return (
    <main>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Sparkles className="h-4 w-4 text-zinc-100" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-zinc-100">Forsig</div>
              <div className="text-[11px] text-zinc-400">Policy-first AI gateway</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link className="ui-btn hidden sm:inline-flex" href="/docs">
              Docs
            </Link>
            <Link className="ui-btn ui-btn-primary" href="/login">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="ui-pill w-fit">
              <Shield className="h-3.5 w-3.5" />
              Edge-enforced budgets • Audit trail • Kill switch
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Make AI spend predictable.
              <span className="block text-zinc-300">Without slowing teams down.</span>
            </h1>

            <p className="mt-4 text-base leading-7 text-zinc-400">
              Forsig is a policy-first gateway for agent workloads. Issue allowance keys, set budgets and velocity caps,
              approve models, and get an operator-grade audit trail — all enforced at the edge.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link className="ui-btn ui-btn-primary px-5" href="/login">
                Launch dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a className="ui-btn px-5" href="#how-it-works">
                See how it works
              </a>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {[
                "Budgets + velocity caps",
                "Allowlisted models",
                "Reserve → settle with exact usage",
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:pl-2">
            <CodeBlock>{snippet}</CodeBlock>
            <div className="mt-3 text-xs text-zinc-500">
              Works with your existing OpenAI-compatible calls — enforced by the allowance key.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:pb-14" id="how-it-works">
        <SectionTitle
          eyebrow="How it works"
          title="A control plane for agent spend"
          subtitle="Forsig sits between your app and the model provider, enforcing policy and logging every request."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Feature
            icon={<KeyRound className="h-5 w-5 text-white" />}
            title="Allowance keys"
            desc="Issue scoped keys that carry budget + model constraints. Revoke instantly."
          />
          <Feature
            icon={<Gauge className="h-5 w-5 text-white" />}
            title="Budgets + velocity caps"
            desc="Set spend caps and rate limits so agents can’t surprise you with runaway costs."
          />
          <Feature
            icon={<LineChart className="h-5 w-5 text-white" />}
            title="Audit-ready logs"
            desc="See spend, request counts, prompt + completion tokens, and model breakdowns."
          />
        </div>

        <div className="mt-6 ui-card p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                k: "Preflight reserve",
                v: "Reserve prompt + max_output before execution. If budget fails, block early.",
              },
              {
                k: "Settle exact usage",
                v: "After usage returns, settle using the exact token counts — no guessing.",
              },
              {
                k: "Operator controls",
                v: "Freeze and kill switch are built in for incident response.",
              },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white">{x.k}</div>
                <div className="mt-1 text-sm text-zinc-400">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:pb-20">
        <div className="ui-card p-8 sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="text-2xl font-semibold tracking-tight text-white">Launch with predictable spend.</div>
              <p className="mt-2 text-sm text-zinc-400">
                Create an agent, set a budget, mint an allowance key — and deploy safely with an audit trail.
              </p>
            </div>
            <Link className="ui-btn ui-btn-primary px-5" href="/login">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row">
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
      </section>
    </main>
  );
}
