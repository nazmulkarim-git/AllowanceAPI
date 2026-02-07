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
  CheckCircle2,
} from "lucide-react";
import { useMemo } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function LogoMark() {
  // Simple premium mark; replace with your SVG anytime
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
      <span className="absolute inset-0 rounded-2xl bg-white/10 blur-xl opacity-0 transition group-hover:opacity-100" />
      <Sparkles className="h-4.5 w-4.5 text-white" />
    </span>
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

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-semibold tracking-wide text-zinc-400">{kicker}</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400 sm:text-base">{sub}</p>
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

  return (
    <div className="relative">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            <LogoMark />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-white">Forsig</div>
              <div className="text-[11px] text-zinc-400">Allowance-native agents</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
            <a href="#features" className="ui-btn !px-3 !py-2">
              Features
            </a>
            <a href="#security" className="ui-btn !px-3 !py-2">
              Security
            </a>
            <a href="#faq" className="ui-btn !px-3 !py-2">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/app" className="ui-btn ui-btn-primary !px-4 !py-2">
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
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
                <a href="#features" className="ui-btn px-5 py-3">
                  See how it works
                </a>
                <span className="text-xs text-zinc-500">
                  YC-ready control plane for agent spend.
                </span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["Policy-first", "Budgets, velocity caps, circuit breakers"],
                  ["Keyed access", "Issue & revoke allowance keys"],
                  ["Audit-ready", "Predictable controls, clean logs"],
                ].map(([t, d]) => (
                  <div key={t} className="ui-card p-4">
                    <div className="text-sm font-semibold text-zinc-100">{t}</div>
                    <div className="mt-1 text-xs text-zinc-400">{d}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* FLOATING PREVIEW */}
            <motion.div
              className={cn("relative w-full max-w-xl lg:max-w-md", reduce ? "" : "animate-floaty")}
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
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
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
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="ui-card p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              kicker="PRODUCT"
              title="Built for real-world risk"
              sub="Control spend, limit burstiness, and lock down models — without slowing shipping."
            />
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

      {/* SECURITY */}
      <section id="security" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="ui-card p-6 sm:p-8">
          <SectionTitle
            kicker="SAFETY"
            title="Guardrails you can explain"
            sub="Forsig is designed so you can justify controls to teammates, auditors, and customers."
          />

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Least privilege keys", "Issue per-agent keys; revoke instantly."],
              ["Defaults that are safe", "Balance + velocity caps are always present."],
              ["Actionable events", "Webhooks let you monitor & respond."],
            ].map(([t, d]) => (
              <div key={t} className="ui-card ui-card-hover p-5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-white/90" />
                  <div>
                    <div className="text-sm font-semibold text-white">{t}</div>
                    <div className="mt-1 text-sm text-zinc-400">{d}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-400">
              Want a quick demo? Use the dashboard to mint a key and test enforcement in minutes.
            </div>
            <Link href="/app" className="ui-btn ui-btn-primary">
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="ui-card p-6 sm:p-8">
          <SectionTitle
            kicker="FAQ"
            title="Quick answers"
            sub="Short, clear explanations you can reuse in a YC application or pitch."
          />

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              {
                q: "What is Forsig?",
                a: "A control plane for agent spend. You set allowance policies (budget, velocity, breakers) and issue keys.",
              },
              {
                q: "Is it only for OpenAI?",
                a: "No — the product is designed around policy enforcement. Provider support can expand as you add adapters.",
              },
              {
                q: "How fast can I integrate?",
                a: "Minutes: create an agent, mint a key, and enforce spend rules on calls immediately.",
              },
              {
                q: "What makes it premium?",
                a: "Simple primitives with safe defaults, great UX, and controls that teams actually trust.",
              },
            ].map((x) => (
              <div key={x.q} className="ui-card ui-card-hover p-5">
                <div className="text-sm font-semibold text-white">{x.q}</div>
                <div className="mt-2 text-sm text-zinc-400">{x.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-400">
            <span className="font-semibold text-zinc-100">Forsig</span> — Control agent spend with elegance.
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a className="text-zinc-400 hover:text-white" href="#features">
              Features
            </a>
            <a className="text-zinc-400 hover:text-white" href="#security">
              Security
            </a>
            <Link className="text-zinc-400 hover:text-white" href="/app">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
