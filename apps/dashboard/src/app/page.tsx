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

function GradientOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, delay }}
    />
  );
}

function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-200 shadow-sm backdrop-blur">
      {icon}
      {children}
    </span>
  );
}

function FeatureCard({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  return (
    <div className="ui-card ui-card-hover p-5">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          <div className="mt-1 text-sm text-zinc-400">{body}</div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHome() {
  const reduce = useReducedMotion();

  const fadeUp = useMemo(
    () =>
      reduce
        ? {}
        : {
            initial: { y: 14, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            transition: { duration: 0.6, ease: "easeOut" as const },
          },
    [reduce]
  );

  const floaty = reduce ? "" : "animate-floaty";

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="relative">
            <GradientOrb className="left-[-120px] top-[-120px] h-[420px] w-[420px] bg-white/10 animate-glow" />
            <GradientOrb className="right-[-160px] bottom-[-160px] h-[520px] w-[520px] bg-white/10 animate-glow" delay={0.15} />

            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
              <motion.div {...fadeUp} className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill icon={<Sparkles className="h-4 w-4" />}>Allowance-native</Pill>
                  <Pill icon={<ShieldCheck className="h-4 w-4" />}>Safety by default</Pill>
                  <Pill icon={<Webhook className="h-4 w-4" />}>Webhooks</Pill>
                </div>

                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Ship AI agents safely — with programmable budgets and circuit breakers.
                </h1>
                <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">
                  Forsig makes spend and velocity constraints first-class. Give agents an allowance, set model
                  guardrails, add a kill switch — and deploy with confidence.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/app" className="ui-btn ui-btn-primary px-5 py-3">
                    Open Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="#pricing" className="ui-btn px-5 py-3">
                    View Pricing
                  </a>
                  <span className="text-xs text-zinc-500">
                    Built for teams that need control, speed, and auditability.
                  </span>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Policy-first", "Budgets, velocity caps, circuit breakers"],
                    ["Keyed access", "Issue & revoke allowance keys"],
                    ["Audit-ready", "Predictable controls, clear defaults"],
                  ].map(([t, d]) => (
                    <div key={t} className="ui-card p-4">
                      <div className="text-sm font-semibold text-zinc-100">{t}</div>
                      <div className="mt-1 text-xs text-zinc-400">{d}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Floating policy preview */}
              <motion.div
                className={cn("relative w-full max-w-xl lg:max-w-md", floaty)}
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <div className="ui-card overflow-hidden p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Policy Preview</div>
                      <div className="text-xs text-zinc-400">Agent: “Support Concierge”</div>
                    </div>
                    <span className="ui-pill">live</span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ["Balance", "$2.00"],
                      ["Velocity", "$0.50 / 60m"],
                      ["Circuit breaker", "10 requests"],
                      ["Models", "gpt-4o-mini"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-xs text-zinc-400">{k}</div>
                        <div className="text-sm font-semibold text-zinc-100">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-zinc-400">Webhook</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="ui-kbd truncate">POST /webhooks/allowance</code>
                      <span className="ui-pill">signed</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="absolute left-0 top-0 h-full w-1/2 bg-white"
                        initial={{ width: "36%" }}
                        animate={{ width: ["36%", "62%", "44%"] }}
                        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Allowance used</span>
                      <span>~48%</span>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] bg-white/10 blur-2xl opacity-30" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="ui-card p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Built for real-world risk</div>
              <div className="mt-1 text-sm text-zinc-400">
                Control spend, limit burstiness, and lock down models — without slowing shipping.
              </div>
            </div>
            <Pill icon={<Zap className="h-4 w-4" />}>Fast setup • Clean defaults</Pill>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <FeatureCard
              title="Budgets that are code"
              body="Give agents balance, refill patterns, and revocation — then reason about spend like an API."
              icon={<Wallet className="h-5 w-5 text-white" />}
            />
            <FeatureCard
              title="Velocity caps"
              body="Clamp the rate of spend by time window. Avoid runaway loops and surprise bills."
              icon={<Gauge className="h-5 w-5 text-white" />}
            />
            <FeatureCard
              title="Circuit breakers"
              body="Auto-freeze on suspicious activity. One flip to pause an agent instantly."
              icon={<ShieldCheck className="h-5 w-5 text-white" />}
            />
            <FeatureCard
              title="Webhooks + audit hooks"
              body="Push events to your stack — monitoring, analytics, incident tooling — in real-time."
              icon={<Webhook className="h-5 w-5 text-white" />}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              name: "Starter",
              price: "$0",
              note: "For solo builders",
              items: ["1 workspace", "Basic policies", "Dashboard access"],
              cta: "Get started",
            },
            {
              name: "Team",
              price: "$49",
              note: "For fast-moving teams",
              items: ["Unlimited agents", "Webhooks", "Policy templates", "Key rotation"],
              cta: "Start team plan",
              featured: true,
            },
            {
              name: "Enterprise",
              price: "Custom",
              note: "For regulated orgs",
              items: ["SLA", "Audit exports", "SSO", "Dedicated support"],
              cta: "Talk to us",
            },
          ].map((p) => (
            <div key={p.name} className={cn("ui-card ui-card-hover p-6", p.featured && "border-white/25 bg-white/[0.06]")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{p.name}</div>
                  <div className="mt-1 text-sm text-zinc-400">{p.note}</div>
                </div>
                {p.featured ? <span className="ui-pill">popular</span> : null}
              </div>

              <div className="mt-5 flex items-end gap-2">
                <div className="text-3xl font-semibold tracking-tight text-white">{p.price}</div>
                {p.price.startsWith("$") ? <div className="text-sm text-zinc-500">/ month</div> : null}
              </div>

              <div className="mt-5 space-y-2">
                {p.items.map((it) => (
                  <div key={it} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 text-white/90" />
                    <span>{it}</span>
                  </div>
                ))}
              </div>

              <Link href="/app" className={cn("mt-6 w-full ui-btn", p.featured && "ui-btn-primary")}>
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-400">
            <span className="font-semibold text-zinc-100">Forsig</span> — Control agent spend with elegance.
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-zinc-400 hover:text-white" href="/app">
              Dashboard
            </Link>
            <a className="text-zinc-400 hover:text-white" href="#pricing">
              Pricing
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
