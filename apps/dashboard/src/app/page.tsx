"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Gauge,
  KeyRound,
  LineChart,
  Check,
  Code2,
  Sparkles,
  Zap,
  Lock,
  Wand2,
  ChevronDown,
} from "lucide-react";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cx("mx-auto", align === "center" ? "max-w-3xl text-center" : "max-w-2xl")}>
      {eyebrow ? (
        <div className={cx("ui-pill", align === "center" ? "mx-auto w-fit" : "w-fit")}>
          <Sparkles className="h-3.5 w-3.5" />
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h2
        className={cx(
          "mt-4 font-semibold tracking-tight text-white",
          align === "center" ? "text-3xl sm:text-4xl" : "text-3xl"
        )}
      >
        {title}
      </h2>
      {subtitle ? <p className="mt-3 text-base leading-7 text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  bullets,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  bullets?: string[];
}) {
  return (
    <div className="ui-card ui-card-hover p-6">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-zinc-400">{desc}</div>

          {bullets?.length ? (
            <div className="mt-4 grid gap-2">
              {bullets.map((b) => (
                <div key={b} className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">{b}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ filename, label, children }: { filename: string; label: string; children: string }) {
  return (
    <div className="ui-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Code2 className="h-4 w-4" />
          {label}
        </div>
        <span className="ui-pill">{filename}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-zinc-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function LogoCloud() {
  const logos = ["OpenAI", "Anthropic", "LangChain", "LangGraph", "Vercel", "Supabase"];
  return (
    <div className="ui-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-zinc-200">Built to fit into your existing stack</div>
        <div className="text-xs text-zinc-500">Drop-in gateway • OpenAI-compatible interface</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {logos.map((l) => (
          <div
            key={l}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300"
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-400">{label}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ui-card ui-card-hover p-5">
      <button
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="text-sm font-semibold text-white">{q}</div>
        <ChevronDown className={cx("h-4 w-4 shrink-0 text-zinc-400 transition", open && "rotate-180")} />
      </button>
      {open ? <p className="mt-3 text-sm leading-6 text-zinc-400">{a}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const snippet = useMemo(
    () => `import { Forsig } from "@forsig/sdk";

const forsig = new Forsig({
  allowanceKey: process.env.FORSIG_KEY,
});

const res = await forsig.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Summarize this ticket…" }],
});`,
    []
  );

  const policySnippet = useMemo(
    () => `// Create an allowance policy for your agent
{
  budget_cents: 3000,
  velocity_window_seconds: 10,
  velocity_cap_cents: 20,
  allowed_models: ["o3-mini", "gpt-4o-mini"],
  circuit_breaker_n: 6
}`,
    []
  );

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur">
        <div className="ui-container flex items-center justify-between py-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Sparkles className="h-4 w-4 text-zinc-100" />
              <span className="absolute inset-0 -z-10 rounded-xl bg-white/10 blur-xl opacity-0 transition group-hover:opacity-100" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-zinc-100">Forsig</div>
              <div className="text-[11px] text-zinc-400">Policy-first AI gateway</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
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

          <div className="flex items-center gap-2">
            <Link className="ui-btn ui-btn-primary" href="/login">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="ui-container pt-14 pb-10 sm:pt-20 sm:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            <div className="ui-pill w-fit">
              <ShieldCheck className="h-3.5 w-3.5" />
              Budgets • Velocity caps • Audit trail • Kill switch
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Predictable agent spend.
              <span className="block text-zinc-300">Operator controls built-in.</span>
            </h1>

            <p className="mt-4 text-base leading-7 text-zinc-400">
              Forsig sits between your app and the model provider. Mint scoped allowance keys, enforce budgets and rate
              limits at the edge, and get an audit-grade ledger of every request — without slowing developers down.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link className="ui-btn ui-btn-primary px-5" href="/login">
                Launch dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a className="ui-btn px-5" href="#product">
                See the product
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Metric value="1 line" label="Drop-in enforcement" />
              <Metric value="Reserve → settle" label="Exact usage accounting" />
              <Metric value="Instant" label="Freeze & revoke keys" />
            </div>

            <div className="mt-6 text-xs text-zinc-500">
              Designed for teams shipping agents in production — from first prototype to incident response.
            </div>
          </div>

          <div className="lg:pl-2">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_55%)] blur-2xl" />
              <div className="relative grid gap-3">
                <CodeBlock filename="server.ts" label="one line to enforce spend">
                  {snippet}
                </CodeBlock>
                <CodeBlock filename="policy.json" label="budget + model constraints">
                  {policySnippet}
                </CodeBlock>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Works with existing OpenAI-compatible calls — enforcement travels with the allowance key.
            </div>
          </div>
        </div>

        <div className="mt-10">
          <LogoCloud />
        </div>
      </section>

      {/* Product */}
      <section className="ui-container pb-10 sm:pb-14" id="product">
        <SectionTitle
          eyebrow="What you get"
          title="A clean control plane for agent spend"
          subtitle="The essentials you need to ship safely: scoped keys, predictable budgets, and an audit trail you can trust."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <FeatureCard
            icon={<KeyRound className="h-5 w-5 text-white" />}
            title="Allowance keys"
            desc="Issue scoped keys that carry budget + model constraints. Rotate and revoke instantly."
            bullets={["Key prefixes for safe sharing", "Per-agent policies", "Revocation on demand"]}
          />
          <FeatureCard
            icon={<Gauge className="h-5 w-5 text-white" />}
            title="Budgets + velocity caps"
            desc="Stop runaway spend with preflight checks, rate limits, and circuit breakers."
            bullets={["Spend caps", "Velocity windows", "Circuit breaker (N)"]}
          />
          <FeatureCard
            icon={<LineChart className="h-5 w-5 text-white" />}
            title="Audit-grade logs"
            desc="See spend, request counts, tokens, and model breakdowns — ready for ops and finance."
            bullets={["Per-model spend", "Prompt vs completion tokens", "Exportable reporting"]}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Reserve → Settle flow</div>
              <span className="ui-pill">exact usage</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { k: "Reserve", v: "Preflight checks reserve prompt + max output. Block early if policy fails." },
                { k: "Execute", v: "Forward request to your provider using your existing client." },
                { k: "Settle", v: "On response, settle with exact token counts — no guessing." },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold text-white">{s.k}</div>
                  <div className="mt-1 text-sm text-zinc-400">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
              {["Accurate per-model pricing", "Deterministic enforcement", "Edge-friendly", "Works with agents"].map((t) => (
                <span key={t} className="ui-pill">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="ui-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Operator mode</div>
              <span className="ui-pill">safety</span>
            </div>

            <div className="mt-4 grid gap-3">
              {[
                { icon: <Zap className="h-4 w-4" />, t: "Freeze", d: "Pause an agent instantly when you see anomalies." },
                { icon: <Lock className="h-4 w-4" />, t: "Kill switch", d: "Stop spend across the board for incident response." },
                { icon: <Wand2 className="h-4 w-4" />, t: "Allowlist", d: "Constrain models to what your team approved." },
              ].map((x) => (
                <div key={x.t} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    {x.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{x.t}</div>
                    <div className="mt-1 text-sm text-zinc-400">{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="ui-container pb-14 sm:pb-20">
        <SectionTitle
          eyebrow="Made for production"
          title="Clean, calm UI for teams under pressure"
          subtitle="Policy and spend should be obvious at a glance — not hidden in dashboards or spreadsheets."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            {
              q: "Finally a budget control that developers won't fight.",
              a: "We shipped enforcement without rewriting our stack. Policies live with the keys and ops can intervene instantly.",
              by: "Engineering Lead",
            },
            {
              q: "Audit logs that finance actually understands.",
              a: "Per-model spend + token breakdowns gave us the visibility we were missing. No more surprise invoices.",
              by: "Ops / Finance",
            },
            {
              q: "The incident controls are a lifesaver.",
              a: "Freeze + kill switch meant we could respond to agent misbehavior immediately — before costs escalated.",
              by: "On-call",
            },
          ].map((t) => (
            <div key={t.q} className="ui-card ui-card-hover p-6">
              <div className="text-sm font-semibold text-white">“{t.q}”</div>
              <div className="mt-3 text-sm leading-6 text-zinc-400">{t.a}</div>
              <div className="mt-4 text-xs text-zinc-500">— {t.by}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="ui-container pb-14 sm:pb-20" id="pricing">
        <SectionTitle
          eyebrow="Pricing"
          title="Start simple. Scale with confidence."
          subtitle="Pick a plan that matches your stage — upgrade when you're ready."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="ui-card ui-card-hover p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Starter</div>
                <div className="mt-1 text-sm text-zinc-400">For prototypes and early production.</div>
              </div>
              <span className="ui-pill">self-serve</span>
            </div>

            <div className="mt-6 text-3xl font-semibold text-white">$0</div>
            <div className="mt-1 text-sm text-zinc-500">Get running, prove value, ship safely.</div>

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
            <div className="mt-1 text-sm text-zinc-500">SSO, higher limits, and support for production ops.</div>

            <div className="mt-6 grid gap-2">
              {["Role-based access", "Exports & reporting", "SLA + support", "Deployment guidance"].map((x) => (
                <div key={x} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4" />
                  <span>{x}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <a className="ui-btn ui-btn-primary w-full" href="mailto:founders@forsig.com">
                Talk to founders <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + Final CTA */}
      <section className="ui-container pb-14 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionTitle
              eyebrow="FAQ"
              title="Common questions"
              subtitle="If you’re not sure where to start, email us — we’ll help you set it up."
              align="left"
            />

            <div className="mt-6 grid gap-3">
              <FaqItem
                q="Do I need to change my provider SDK?"
                a="No. Forsig is designed to work with existing OpenAI-compatible calls. You enforce policy by using an allowance key."
              />
              <FaqItem
                q="How does Reserve → Settle work?"
                a="Forsig preflights policy and reserves budget using prompt + max output. After the provider responds, it settles based on exact token counts."
              />
              <FaqItem
                q="Can I limit which models agents use?"
                a="Yes. Use allowlists to constrain models per agent (or per key). This helps standardize cost and performance."
              />
              <FaqItem
                q="What happens during an incident?"
                a="Ops can freeze a specific agent or use the kill switch to stop spend quickly. Keys can also be revoked instantly."
              />
            </div>
          </div>

          <div className="ui-card p-8 sm:p-10">
            <div className="text-2xl font-semibold tracking-tight text-white">Launch with predictable spend.</div>
            <p className="mt-2 text-sm text-zinc-400">
              Create an agent, set a budget, mint an allowance key — and deploy safely with an audit trail.
            </p>

            <div className="mt-6 grid gap-3">
              <Link className="ui-btn ui-btn-primary w-full" href="/login">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a className="ui-btn w-full" href="mailto:founders@forsig.com">
                Email founders@forsig.com
              </a>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-medium text-zinc-200">Design note</div>
              <div className="mt-1 text-xs leading-6 text-zinc-500">
                The UI intentionally uses fewer elements, clearer hierarchy, and consistent spacing — so it feels calm,
                premium, and enterprise-ready without being heavy.
              </div>
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
      </section>
    </main>
  );
}
