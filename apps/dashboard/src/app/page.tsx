"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Gauge,
  Wallet,
  Zap,
  Webhook,
  Sparkles,
  Check,
} from "lucide-react";
import { useMemo } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function GradientOrb({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay }}
    />
  );
}

function Pill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-black/70 shadow-sm backdrop-blur">
      {icon}
      {children}
    </span>
  );
}

function Card({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-black/5 blur-3xl" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white shadow-sm">
            {icon}
          </div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-black/70">{body}</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

export default function LandingPage() {
  const reduce = useReducedMotion();

  const heroMotion = useMemo(
    () => ({
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.7, ease: "easeOut" as const },
    }),
    []
  );

  const float = reduce
    ? {}
    : {
        animate: {
          y: [0, -10, 0],
        },
        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const },
      };

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[0.35]" />
        <GradientOrb className="-left-40 -top-40 h-[520px] w-[520px] bg-gradient-to-br from-black/10 via-black/5 to-transparent" />
        <GradientOrb
          className="-right-48 top-24 h-[560px] w-[560px] bg-gradient-to-bl from-black/10 via-black/5 to-transparent"
          delay={0.15}
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-black text-white">
              F
            </span>
            <span>Forsig</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-black/70 md:flex">
            <a href="#product" className="hover:text-black">
              Product
            </a>
            <a href="#security" className="hover:text-black">
              Safety
            </a>
            <a href="#pricing" className="hover:text-black">
              Pricing
            </a>
            <a href="#faq" className="hover:text-black">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 md:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
            >
              Launch dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <motion.div {...heroMotion}>
                <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                  Guardrails for AI agents — budgets, caps, and circuit breakers
                </Pill>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
                  Allowance-native AI agents that{" "}
                  <span className="underline decoration-black/20 underline-offset-8">
                    don’t surprise-bill
                  </span>
                  .
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-black/70">
                  Forsig makes it easy to ship agents safely: define budgets,
                  velocity windows, model allowlists, and webhook alerts — then
                  hand your agents an allowance key.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/app"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
                  >
                    Get started <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-black/80 shadow-sm backdrop-blur transition hover:bg-white"
                  >
                    Read docs
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-2 text-xs text-black/60">
                  {[
                    "Supabase auth",
                    "Per-agent budgets",
                    "Velocity caps",
                    "Circuit breakers",
                    "Webhook alerts",
                  ].map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <motion.div
                className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/80 shadow-sm backdrop-blur"
                {...float}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/5" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-black/60">
                        Agent policy preview
                      </div>
                      <div className="mt-1 text-lg font-semibold tracking-tight">
                        “Customer Support Agent”
                      </div>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/70 shadow-sm">
                      Live
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {[
                      { k: "Balance", v: "$2.00", icon: <Wallet className="h-4 w-4" /> },
                      { k: "Velocity cap", v: "$0.50 / 60m", icon: <Gauge className="h-4 w-4" /> },
                      { k: "Models", v: "gpt-4o-mini", icon: <Zap className="h-4 w-4" /> },
                      { k: "Circuit breaker", v: "10 calls", icon: <ShieldCheck className="h-4 w-4" /> },
                      { k: "Webhook", v: "alerts.forsig.ai", icon: <Webhook className="h-4 w-4" /> },
                    ].map((row) => (
                      <div
                        key={row.k}
                        className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="text-black/70">{row.icon}</span>
                          {row.k}
                        </div>
                        <div className="text-sm font-semibold">{row.v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-black/10 bg-black p-4 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        Allowance key
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText("forsig_live_••••••••••")}
                        className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/15"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 font-mono text-xs text-white/80">
                      forsig_live_••••••••••
                    </div>
                    <div className="mt-3 text-xs text-white/70">
                      Hand this to your agent. Rotate anytime.
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10 blur-3xl" />
              <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-black/10 blur-3xl" />
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="product" className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionLabel>Designed for fast teams</SectionLabel>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                Safety-by-default controls your agents can’t ignore
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70">
                Put spending and behavior constraints where they belong: on the
                key. No more “best effort” guardrails in prompt text.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card
              title="Programmable budgets"
              body="Create per-agent balances, replenish on your schedule, and keep audit-friendly constraints in one place."
              icon={<Wallet className="h-5 w-5" />}
            />
            <Card
              title="Velocity caps"
              body="Stop runaway loops: set $/window limits so usage stays predictable even under load."
              icon={<Gauge className="h-5 w-5" />}
            />
            <Card
              title="Circuit breakers"
              body="Trip after N calls, throttle, or pause instantly. You decide what “too risky” means."
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          className="mx-auto max-w-6xl px-4 pb-16 md:pb-24"
        >
          <div className="grid gap-10 rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur md:grid-cols-2 md:items-center md:p-12">
            <div>
              <SectionLabel>Operationally safe</SectionLabel>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                Ship agents with confidence
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-black/70">
                Forsig is built around safety primitives teams actually need:
                allowlists, secrets rotation, and webhook alerts when thresholds
                are hit.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-black/70">
                {[
                  "Model allowlists per agent",
                  "Webhook alerts for policy events",
                  "Key rotation and quick revocation",
                  "Admin visibility across agents",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-lg bg-black text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-2">
                <Pill icon={<Webhook className="h-3.5 w-3.5" />}>
                  Alerting ready
                </Pill>
                <Pill icon={<Zap className="h-3.5 w-3.5" />}>Fast setup</Pill>
                <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                  Secure by default
                </Pill>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black p-6 text-white shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
              <div className="relative">
                <div className="text-sm font-semibold">Policy webhook</div>
                <div className="mt-1 text-xs text-white/70">
                  Get notified when an agent hits thresholds.
                </div>

                <pre className="mt-5 overflow-x-auto rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-white/80">
{`POST /webhook
{
  "event": "velocity_cap_reached",
  "agent_id": "agt_123",
  "window_seconds": 3600,
  "cap_cents": 50,
  "spent_cents": 50
}`}
                </pre>

                <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Slack
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    PagerDuty
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Custom
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <SectionLabel>Simple pricing</SectionLabel>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                Start free, scale when it matters
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70">
                Pricing is intentionally straightforward while you ship. Upgrade
                when you need more agents, higher throughput, and admin controls.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "$0",
                note: "For early prototypes",
                features: ["3 agents", "Budgets + velocity caps", "Webhook alerts"],
                featured: false,
              },
              {
                name: "Growth",
                price: "$49",
                note: "For teams shipping",
                features: [
                  "Unlimited agents",
                  "Admin dashboards",
                  "Advanced circuit breakers",
                  "Priority support",
                ],
                featured: true,
              },
              {
                name: "Enterprise",
                price: "Let’s talk",
                note: "For regulated orgs",
                features: ["SAML/SSO", "Dedicated infra", "Custom SLAs"],
                featured: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "relative overflow-hidden rounded-3xl border p-6 shadow-sm backdrop-blur",
                  tier.featured
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white/80"
                )}
              >
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute -left-28 -top-28 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                  <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{tier.name}</div>
                    {tier.featured ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                        Most popular
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-3xl font-semibold tracking-tight">
                      {tier.price}
                    </div>
                    {tier.price.startsWith("$") ? (
                      <div className={cn("text-sm", tier.featured ? "text-white/70" : "text-black/60")}>
                        /mo
                      </div>
                    ) : null}
                  </div>
                  <div className={cn("mt-1 text-xs", tier.featured ? "text-white/70" : "text-black/60")}>
                    {tier.note}
                  </div>

                  <ul className="mt-5 space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-lg",
                          tier.featured ? "bg-white text-black" : "bg-black text-white"
                        )}>
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className={tier.featured ? "text-white/85" : "text-black/70"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <Link
                      href="/app"
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                        tier.featured
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-black text-white hover:translate-y-[-1px] hover:shadow-md"
                      )}
                    >
                      Choose {tier.name} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-6xl px-4 pb-20 md:pb-28">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                Answers, without the fluff
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-black/70">
                Built for speed — but with the operational controls you need as
                soon as you have real traffic.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  q: "Is this just a wrapper around the API?",
                  a: "No. Forsig enforces budgets and caps at the key level, so your agent can’t bypass them. It’s operational guardrails, not prompt advice.",
                },
                {
                  q: "Can I alert my team when something goes wrong?",
                  a: "Yes — webhook events fire when caps, breakers, or balances are hit. Route them to Slack, PagerDuty, or anywhere.",
                },
                {
                  q: "Do you support multiple agents per user?",
                  a: "That’s the point. Each agent can have its own policy: balance, allowlisted models, velocity window, and breaker thresholds.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold tracking-tight">
                    <span className="flex items-center justify-between gap-3">
                      {item.q}
                      <span className="text-black/40 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-black/70">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-black/10 bg-black p-8 text-white shadow-sm md:p-12">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="text-2xl font-semibold tracking-tight">
                  Ready to ship safer agents?
                </div>
                <div className="mt-2 text-sm text-white/70">
                  Set budgets and guardrails in minutes. Don’t let your next
                  deploy become a surprise invoice.
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Open dashboard <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-black/60 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Forsig. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/docs" className="hover:text-black">
              Docs
            </Link>
            <Link href="/login" className="hover:text-black">
              Sign in
            </Link>
            <Link href="/app" className="hover:text-black">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
