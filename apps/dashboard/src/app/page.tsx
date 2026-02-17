// apps/dashboard/src/app/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Gauge,
  KeyRound,
  Zap,
  Eye,
  Lock,
  Check,
  Mail,
} from "lucide-react";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
      {children}
    </span>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          {icon}
        </div>
        <div>
          <div className="text-base font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-white/70">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16">
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
          <p className="mt-3 text-base leading-7 text-white/70">{subtitle}</p>
        ) : null}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-sm leading-6 text-white/80">
      <code>{children}</code>
    </pre>
  );
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(
    null
  );
  const [loading, setLoading] = useState(false);

  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:shadow-white/20";
  const secondaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07]";

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && email.includes("@") && !loading;
  }, [email, loading]);

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          company: company.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed");
      setStatus({ ok: true, msg: "You're on the waitlist. We'll email you soon." });
      setEmail("");
      setName("");
      setCompany("");
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Top nav */}
      <header className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl border border-white/10 bg-white/5" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Forsig</div>
              <div className="text-xs text-white/60">Runtime guardrails for OpenAI</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white" href="#how">
              How it works
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white" href="#features">
              Product
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white" href="#pricing">
              Pricing
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white" href="/docs">
              Docs
            </Link>
            <Link className={secondaryBtn} href="/talk-to-founders">
              Talk to founders <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto w-fit">
            <Pill>
              <ShieldCheck className="h-3.5 w-3.5" />
              OpenAI compatible today · Anthropic & Google coming soon
            </Pill>
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Predictable AI spend.
            <span className="block text-white/70">Enforced at runtime.</span>
          </h1>

          <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg">
            Forsig sits between your app and OpenAI to enforce budgets, velocity caps,
            model allowlists, and instant shutdown — then settles exact usage for audit
            and reporting.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a className={primaryBtn} href="#waitlist">
              Join waitlist <ArrowRight className="h-4 w-4" />
            </a>
            <Link className={secondaryBtn} href="/talk-to-founders">
              Talk to founders <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              ✅ Keep your OpenAI SDK
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              ✅ Drop-in baseURL change
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              ✅ Audit-grade logs
            </div>
          </div>
        </div>

        {/* Real integration snippet (no fake SDK) */}
        <div className="mx-auto mt-10 max-w-4xl">
          <CodeBlock
            children={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.forsig.com/v1", // point to Forsig gateway
  defaultHeaders: {
    "x-forsig-allowance-key": process.env.FORSIG_ALLOWANCE_KEY!,
  },
});

const resp = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Summarize this ticket..." }],
});`}
          />
          <p className="mt-3 text-center text-xs text-white/55">
            OpenAI compatible today. Anthropic & Google are coming soon.
          </p>
        </div>
      </section>

      <Section
        id="how"
        eyebrow="How it works"
        title="Forsig enforces policy between your app and OpenAI"
        subtitle="Enforcement travels with the allowance key: preflight checks, safe execution, and exact settlement for reporting."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card icon={<Zap className="h-5 w-5 text-white/80" />} title="Your app">
            You call the model as usual.
          </Card>
          <Card icon={<Lock className="h-5 w-5 text-white/80" />} title="Forsig gateway">
            Preflight budgets, velocity caps, and allowlists.
          </Card>
          <Card icon={<KeyRound className="h-5 w-5 text-white/80" />} title="OpenAI">
            Request executes using your provider key.
          </Card>
          <Card icon={<Eye className="h-5 w-5 text-white/80" />} title="Audit trail">
            Settle exact tokens & cost breakdowns.
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Budgets</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Velocity caps</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Model allowlist</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Freeze</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Kill switch</span>
        </div>
      </Section>

      <Section
        id="features"
        eyebrow="Product"
        title="Runtime guardrails for cost and control"
        subtitle="Strong defaults, operator controls, and audit-ready visibility — without changing how your team builds."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card icon={<Gauge className="h-5 w-5 text-white/80" />} title="Runtime enforcement">
            Intercept every request and verify it against budgets, velocity caps, and allowlists before it runs.
          </Card>
          <Card icon={<Lock className="h-5 w-5 text-white/80" />} title="Instant operator controls">
            Freeze an agent immediately when you see anomalies — or flip a kill switch during an incident.
          </Card>
          <Card icon={<KeyRound className="h-5 w-5 text-white/80" />} title="Allowance keys">
            Issue scoped keys that carry policy with them. Rotate safely, revoke instantly, and share prefixes.
          </Card>
          <Card icon={<Eye className="h-5 w-5 text-white/80" />} title="Full visibility">
            Audit-grade logs: spend, request counts, tokens, and model breakdowns — ready for ops and finance.
          </Card>
        </div>
      </Section>

      <Section
        id="pricing"
        eyebrow="Pricing"
        title="Start free. Upgrade when you’re scaling."
        subtitle="We’re onboarding early teams now. Join the waitlist to get access."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white">Starter</div>
              <Pill>Early access</Pill>
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">$0</div>
            <div className="mt-2 text-sm text-white/60">For prototypes and early production.</div>
            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {[
                "Allowance keys",
                "Budgets + velocity caps",
                "Audit logs",
                "Freeze controls",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-white/70" /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <a href="#waitlist" className={primaryBtn}>
                Join waitlist <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white">Team</div>
              <Pill>Contact</Pill>
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">Custom</div>
            <div className="mt-2 text-sm text-white/60">
              Higher limits, support, and production ops help.
            </div>
            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {["Role-based access", "Exports & reporting", "SLA + support", "Deployment guidance"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-white/70" /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link href="/talk-to-founders" className={primaryBtn}>
                Talk to founders <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Waitlist */}
      <section id="waitlist" className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto w-fit">
              <Pill>
                <Mail className="h-3.5 w-3.5" />
                Waitlist
              </Pill>
            </div>
            <h3 className="mt-4 text-3xl font-semibold text-white">
              Get early access to Forsig
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Invitation-only onboarding. We’ll email you when your spot is ready.
            </p>
          </div>

          <form
            onSubmit={joinWaitlist}
            className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 sm:col-span-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className={cx(
                primaryBtn,
                "sm:col-span-1",
                (!canSubmit || loading) && "opacity-60"
              )}
            >
              {loading ? "Joining…" : "Join waitlist"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {status ? (
            <div
              className={cx(
                "mx-auto mt-4 max-w-2xl rounded-xl border px-4 py-3 text-sm",
                status.ok
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/20 bg-red-500/10 text-red-200"
              )}
            >
              {status.msg}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-white/55">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">OpenAI ✅</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Anthropic ⏳</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Google ⏳</span>
          </div>
        </div>

        <footer className="mx-auto mt-10 max-w-6xl px-2 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Forsig ·{" "}
          <Link className="underline hover:text-white" href="/docs">
            Docs
          </Link>{" "}
          ·{" "}
          <Link className="underline hover:text-white" href="/talk-to-founders">
            Contact
          </Link>
        </footer>
      </section>
    </main>
  );
}
