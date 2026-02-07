"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  CircleDollarSign,
  Fingerprint,
  Flame,
  Gauge,
  LineChart,
  Lock,
  Shield,
  Wand2,
  Zap,
} from "lucide-react";
import { OpenDashboardButton } from "@/components/landing/OpenDashboardButton";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/30 via-fuchsia-500/20 to-cyan-400/20 blur-3xl" />
      <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-400/20 via-cyan-400/15 to-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-40 left-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-fuchsia-500/15 via-indigo-500/10 to-cyan-400/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.0),rgba(2,6,23,0.72),rgba(2,6,23,1))]" />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold tracking-[0.22em] text-white/60">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">{desc}</p>
    </div>
  );
}

function Card({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07]">
      <div aria-hidden className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-white/90">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-white/70">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function TerminalMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <p className="text-xs font-medium text-white/60">forsig.proxy</p>
      </div>
      <div className="p-4 font-mono text-xs leading-6 text-white/80 sm:p-5">
        <p className="text-white/60"># mint an allowance key</p>
        <p>
          <span className="text-white/50">$</span> forsig mint --agent "support-bot" --cap $50/day --models gpt-4o-mini
        </p>
        <p className="text-emerald-300/90">key_•••••• minted ✓</p>
        <p className="mt-3 text-white/60"># request passes… until a policy trips</p>
        <p>
          <span className="text-white/50">$</span> curl https://proxy.forsig.ai/v1/chat/completions -H "Authorization: Bearer key_••••" …
        </p>
        <p className="text-cyan-300/90">200 OK · cost $0.04</p>
        <p className="mt-3 text-white/60"># velocity cap reached</p>
        <p className="text-rose-300/90">429 BLOCKED · policy: velocity_cap · reason: spike detected</p>
        <p className="mt-3 text-white/60"># kill switch (instant)</p>
        <p>
          <span className="text-white/50">$</span> forsig kill --agent "support-bot"
        </p>
        <p className="text-amber-300/90">access revoked · requests denied ✓</p>
      </div>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.25),transparent_55%)]" />
    </div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <Glow />

      {/* Top nav */}
      <div className="relative">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <Shield className="h-5 w-5 text-white/90" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Forsig</span>
            <span className="ml-2 hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70 sm:inline-flex">
              Beta
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="hidden rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <OpenDashboardButton />
          </div>
        </div>
      </div>

      {/* Hero */}
      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.08, delayChildren: 0.05 },
              },
            }}
          >
            <motion.div variants={fadeUp} transition={{ duration: reduceMotion ? 0 : 0.55, ease: "easeOut" }}>
              <Pill>
                <Zap className="h-3.5 w-3.5" />
                Real-time control plane for AI and API keys
              </Pill>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
              className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              Ship AI faster — with
              <span className="relative mx-2 inline-block">
                <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                  control
                </span>
                <span aria-hidden className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </span>
              that&apos;s instant.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
              className="mt-4 text-base leading-7 text-white/70"
            >
              Forsig issues keys, enforces policies, blocks abuse, and flips a kill switch in real time — before leaks and
              runaway spend become incidents.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
              className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <OpenDashboardButton variant="primary" />
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                Read the docs <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
              className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              <Pill>
                <Bolt className="h-3.5 w-3.5" />
                Kill switch
              </Pill>
              <Pill>
                <Gauge className="h-3.5 w-3.5" />
                Velocity caps
              </Pill>
              <Pill>
                <CircleDollarSign className="h-3.5 w-3.5" />
                Cost limits
              </Pill>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.75, ease: "easeOut", delay: 0.05 }}
            className="relative"
          >
            <TerminalMock />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-white/60">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                <p className="font-semibold text-white/90"><span className="text-cyan-300">Allowed</span></p>
                <p className="mt-1">Requests with policy checks</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                <p className="font-semibold text-white/90"><span className="text-rose-300">Blocked</span></p>
                <p className="mt-1">Caps & anomaly triggers</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                <p className="font-semibold text-white/90"><span className="text-amber-300">Revoked</span></p>
                <p className="mt-1">Instant kill switch events</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Logos / trust row */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2 text-xs text-white/45 sm:gap-6">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">OpenAI-compatible proxy</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Policy engine</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Audit-friendly</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Built for teams</span>
        </div>
      </main>

      {/* Problem */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle
          eyebrow="THE REALITY"
          title="AI usage scales. Incidents scale faster."
          desc="Leaked keys, runaway spend, and unauthorized calls happen in seconds. Most stacks only notice after the bill or the breach."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Card
            icon={<Flame className="h-5 w-5" />}
            title="Runaway spend"
            desc="One misconfigured agent can burn through budgets overnight. Forsig enforces spend limits before damage happens."
          />
          <Card
            icon={<Fingerprint className="h-5 w-5" />}
            title="Key leaks"
            desc="Keys are copied, logged, and shared. Forsig lets you revoke access instantly — without redeploys."
          />
          <Card
            icon={<LineChart className="h-5 w-5" />}
            title="Blind spots"
            desc="You can't govern what you can't see. Forsig turns usage into an auditable stream of decisions."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle
          eyebrow="HOW IT WORKS"
          title="Three steps to real-time control"
          desc="Put Forsig between your agents and your providers. You keep shipping — Forsig keeps guardrails on."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Card
            icon={<Wand2 className="h-5 w-5" />}
            title="Mint keys"
            desc="Issue allowance keys per agent, environment, or customer. Rotate anytime — without rewriting code."
          />
          <Card
            icon={<Gauge className="h-5 w-5" />}
            title="Attach policies"
            desc="Velocity caps, model gates, spend limits, and org rules. Policies evaluate on every request."
          />
          <Card
            icon={<Bolt className="h-5 w-5" />}
            title="Act instantly"
            desc="Freeze, revoke, or kill switch in seconds. Audit every decision, from allow to block to revoke."
          />
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle
          eyebrow="BUILT FOR PRODUCTION"
          title="Guardrails that feel invisible"
          desc="Design your control plane once. Then let every agent inherit safe defaults."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card icon={<Shield className="h-5 w-5" />} title="Kill switch" desc="Shut down a single agent or your whole org instantly." />
          <Card icon={<CircleDollarSign className="h-5 w-5" />} title="Budget & cost caps" desc="Block or throttle when budgets are at risk." />
          <Card icon={<Zap className="h-5 w-5" />} title="Velocity caps" desc="Prevent spikes and abuse with per-minute/hour limits." />
          <Card icon={<Lock className="h-5 w-5" />} title="Model gating" desc="Allow only approved models per agent or environment." />
          <Card icon={<BadgeCheck className="h-5 w-5" />} title="Audit trail" desc="Every allow/deny/revoke becomes an event you can review." />
          <Card icon={<Bolt className="h-5 w-5" />} title="OpenAI-compatible proxy" desc="Drop in with minimal changes to existing clients." />
        </div>
      </section>

      {/* Security */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur sm:p-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-white/60">TRUST & SAFETY</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Security posture you can explain.</h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Forsig is designed to reduce blast radius. Keys are scoped, policies are enforced at the edge, and every
              action is auditable. Start simple — grow into stricter controls.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              <li className="flex gap-3"><span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-black/20"><BadgeCheck className="h-4 w-4" /></span>Scoped keys per agent / environment</li>
              <li className="flex gap-3"><span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-black/20"><BadgeCheck className="h-4 w-4" /></span>Real-time policy enforcement per request</li>
              <li className="flex gap-3"><span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-black/20"><BadgeCheck className="h-4 w-4" /></span>Instant revoke / kill switch</li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Live policy decision</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">audit</span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-white/80">agent: <span className="text-white">support-bot</span></p>
                <p className="text-white/80">model: <span className="text-white">gpt-4o-mini</span></p>
                <p className="text-white/80">cost_estimate: <span className="text-white">$0.04</span></p>
                <p className="mt-2 text-emerald-300/90">decision: ALLOW</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-white/80">agent: <span className="text-white">support-bot</span></p>
                <p className="text-white/80">policy: <span className="text-white">velocity_cap</span></p>
                <p className="text-white/80">reason: <span className="text-white">spike detected</span></p>
                <p className="mt-2 text-rose-300/90">decision: BLOCK</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-white/80">action: <span className="text-white">kill_switch</span></p>
                <p className="text-white/80">scope: <span className="text-white">agent</span></p>
                <p className="mt-2 text-amber-300/90">status: REVOKED</p>
              </div>
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(34,211,238,0.18),transparent_55%)]" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur sm:p-10">
          <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-white">Ready to put guardrails on your AI?</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Open the dashboard, mint a key, attach a policy — and watch enforcement happen in real time.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <OpenDashboardButton variant="primary" />
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                Quickstart
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-4 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Forsig. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-white/70">Docs</Link>
            <Link href="/login" className="hover:text-white/70">Sign in</Link>
            <Link href="/app" className="hover:text-white/70">Dashboard</Link>
          </div>
        </footer>
      </section>
    </div>
  );
}
