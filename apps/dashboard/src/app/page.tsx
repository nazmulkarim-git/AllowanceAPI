"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Bot,
  Cable,
  Check,
  Gauge,
  KeyRound,
  LineChart,
  Lock,
  Radar,
  Shield,
  Sparkles,
  Terminal,
  Wallet,
  Zap,
  Database,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: d },
  }),
};

const shimmer =
  "before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.14),transparent)] before:translate-x-[-120%] hover:before:translate-x-[120%] before:transition before:duration-1000 before:ease-out before:pointer-events-none";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatInt(n: number) {
  return Intl.NumberFormat().format(Math.round(n));
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-[80px]" />
      <div className="absolute -bottom-56 right-[-12%] h-[620px] w-[620px] rounded-full bg-white/5 blur-[90px]" />
      <div className="absolute -bottom-40 left-[-10%] h-[520px] w-[520px] rounded-full bg-white/5 blur-[90px]" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_0%,rgba(255,255,255,0.12),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.0),rgba(0,0,0,0.78))]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:48px_48px]" />
    </div>
  );
}

function Noise() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.55%22/%3E%3C/svg%3E')]"
    />
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80",
        className
      )}
    >
      {children}
    </span>
  );
}

function Magnetic({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        x.set(dx * 0.06);
        y.set(dy * 0.06);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
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
    <div className="mx-auto max-w-2xl text-center">
      <div className="flex items-center justify-center">
        <Pill>
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </Pill>
      </div>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-pretty text-base leading-relaxed text-white/70">
        {desc}
      </p>
    </div>
  );
}

function Marquee({ items }: { items: string[] }) {
  return (
    <div className="relative mt-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent" />
      <motion.div
        className="flex w-max gap-3 py-2"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, ease: "linear", repeat: Infinity }}
      >
        {[...items, ...items].map((t, i) => (
          <span
            key={i}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/70"
          >
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** ----------------------------
 *  (1) Interactive Budget Slider Demo
 *  Drag slider -> reserve/settle + audit update
 *  ---------------------------- */
type ModelKey = "gpt-4o" | "gpt-4.1" | "o4-mini" | "gpt-4o-mini";

type ModelPricing = {
  key: ModelKey;
  label: string;
  inputPer1M: number; // USD
  outputPer1M: number; // USD
  notes?: string;
};

const PRICING: ModelPricing[] = [
  { key: "gpt-4o", label: "gpt-4o", inputPer1M: 5.0, outputPer1M: 15.0, notes: "Premium general" },
  { key: "gpt-4.1", label: "gpt-4.1", inputPer1M: 3.0, outputPer1M: 12.0, notes: "Strong reasoning" },
  { key: "o4-mini", label: "o4-mini", inputPer1M: 0.6, outputPer1M: 2.4, notes: "Fast + efficient" },
  { key: "gpt-4o-mini", label: "gpt-4o-mini", inputPer1M: 0.15, outputPer1M: 0.6, notes: "Lowest cost" },
];

// smooth number animation component
function AnimatedNumber({
  value,
  suffix,
  prefix,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 140, damping: 22 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [spring]);

  const text = `${prefix ?? ""}${formatInt(display)}${suffix ?? ""}`;
  return <span className={className}>{text}</span>;
}

function BudgetSliderDemo({
  selectedModel,
  onChangeModel,
}: {
  selectedModel: ModelKey;
  onChangeModel: (m: ModelKey) => void;
}) {
  const model = PRICING.find((p) => p.key === selectedModel) ?? PRICING[0];

  // slider states
  const [budgetCents, setBudgetCents] = useState(2500); // $25
  const [promptTokens, setPromptTokens] = useState(1500);
  const [maxOutTokens, setMaxOutTokens] = useState(800);

  // fake "actual usage returned" (settle)
  const actualOutTokens = Math.round(maxOutTokens * 0.72);
  const actualPromptTokens = promptTokens;

  // pricing math (USD per token)
  const inUsdPerToken = model.inputPer1M / 1_000_000;
  const outUsdPerToken = model.outputPer1M / 1_000_000;

  // preflight reserve = prompt + max_output
  const reserveUsd = actualPromptTokens * inUsdPerToken + maxOutTokens * outUsdPerToken;
  const reserveCents = Math.round(reserveUsd * 100);

  // settle = prompt + actual_output
  const settleUsd = actualPromptTokens * inUsdPerToken + actualOutTokens * outUsdPerToken;
  const settleCents = Math.round(settleUsd * 100);

  // remaining budget after settle (demo)
  const remaining = clamp(budgetCents - settleCents, 0, 999999999);

  const allowed = settleCents <= budgetCents;

  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      <div className={cn("relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-7", shimmer)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <SlidersHorizontal className="h-5 w-5 text-white/75" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">Interactive budget demo</div>
              <div className="text-sm text-white/60">Drag budget. Watch reserve → settle → audit.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Pill className={cn("text-white/80", allowed ? "border-white/15" : "border-white/25 bg-white/[0.10]")}>
              <Shield className="h-3.5 w-3.5" />
              {allowed ? "Allowed" : "Blocked"}
            </Pill>
          </div>
        </div>

        {/* model selector */}
        <div className="mt-5 flex flex-wrap gap-2">
          {PRICING.map((m) => {
            const active = m.key === selectedModel;
            return (
              <button
                key={m.key}
                onClick={() => onChangeModel(m.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Budget slider */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Budget</span>
            <span className="text-white/80">{formatUsd(budgetCents)}</span>
          </div>
          <input
            className="mt-2 w-full accent-white"
            type="range"
            min={200}
            max={20000}
            step={50}
            value={budgetCents}
            onChange={(e) => setBudgetCents(parseInt(e.target.value, 10))}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
            <span>$2</span>
            <span>$200</span>
          </div>
        </div>

        {/* Tokens controls */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Prompt tokens</span>
              <span className="text-white/80">{formatInt(promptTokens)}</span>
            </div>
            <input
              className="mt-2 w-full accent-white"
              type="range"
              min={100}
              max={12000}
              step={50}
              value={promptTokens}
              onChange={(e) => setPromptTokens(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Max output tokens</span>
              <span className="text-white/80">{formatInt(maxOutTokens)}</span>
            </div>
            <input
              className="mt-2 w-full accent-white"
              type="range"
              min={50}
              max={8000}
              step={50}
              value={maxOutTokens}
              onChange={(e) => setMaxOutTokens(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        {/* Reserve -> Settle */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-white/60">Preflight reserve</div>
            <div className="mt-2 text-lg font-semibold text-white break-all tabular-nums leading-tight">
              {formatUsd(reserveCents)}
            </div>
            <div className="mt-1 text-[11px] text-white/45">prompt + max_output</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-white/60">Settle (actual)</div>
            <div className="mt-2 text-lg font-semibold text-white break-all tabular-nums leading-tight">
              {formatUsd(settleCents)}
            </div>
            <div className="mt-1 text-[11px] text-white/45">
              output actual: {formatInt(actualOutTokens)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-white/60">Budget remaining</div>
            <div className="mt-2 text-lg font-semibold text-white break-all tabular-nums leading-tight">
              {formatUsd(remaining)}
            </div>
            <div className="mt-1 text-[11px] text-white/45">{allowed ? "green path" : "policy blocks"}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">Audit snapshot (animated)</div>
            <Pill className="text-white/70">
              <Database className="h-3.5 w-3.5" />
              DB pricing
            </Pill>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] text-white/55">Total spend</div>
              <div className="mt-1 text-base font-semibold text-white tabular-nums break-all leading-tight">
                {formatUsd(settleCents)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] text-white/55">Requests</div>
              <div className="mt-1 text-base font-semibold text-white tabular-nums break-all leading-tight">
                <AnimatedNumber value={Math.max(1, Math.round(settleCents / 30))} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] text-white/55">Prompt tokens</div>
              <div className="mt-1 text-base font-semibold text-white tabular-nums break-all leading-tight">
                <AnimatedNumber value={actualPromptTokens} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] text-white/55">Completion tokens</div>
              <div className="mt-1 text-base font-semibold text-white tabular-nums break-all leading-tight">
                <AnimatedNumber value={actualOutTokens} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: explainers */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Shield className="h-5 w-5 text-white/75" />
          </div>
          <div>
            <div className="text-base font-semibold text-white">What’s happening</div>
            <div className="text-sm text-white/60">Forsig enforces policy at the edge.</div>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm text-white/70">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <KeyRound className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">Allowance keys</div>
              <div className="text-white/60">
                Keys carry budget constraints so teams can move fast without surprise spend.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Gauge className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">Reserve → settle</div>
              <div className="text-white/60">
                Preflight reserve uses prompt + max_output; settlement charges exact usage returned.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Wallet className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">DB-based model pricing</div>
              <div className="text-white/60">
                Pricing is not hardcoded. Each model’s input/output rate comes from your database.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <LineChart className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">Audit clarity</div>
              <div className="text-white/60">
                Every request is accounted for: spend, tokens, requests, and model usage.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/45 p-4">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Terminal className="h-4 w-4" />
            <span>Why it feels “premium”</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Motion is used as product feedback: you drag budgets, numbers respond, and the system story becomes
            obvious without reading docs.
          </p>
        </div>
      </div>
    </div>
  );
}

/** ----------------------------
 *  (2) Animated Model Pricing Table
 *  Switch models -> animate table + cost examples
 *  ---------------------------- */
function PricingTable({
  selectedModel,
  onChangeModel,
}: {
  selectedModel: ModelKey;
  onChangeModel: (m: ModelKey) => void;
}) {
  const model = PRICING.find((p) => p.key === selectedModel) ?? PRICING[0];

  // example workloads
  const workloads = useMemo(
    () => [
      { name: "Small chat", prompt: 800, out: 300 },
      { name: "Agent step", prompt: 2500, out: 1100 },
      { name: "Tool-heavy", prompt: 6000, out: 2500 },
    ],
    []
  );

  const inUsdPerToken = model.inputPer1M / 1_000_000;
  const outUsdPerToken = model.outputPer1M / 1_000_000;

  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      <div className={cn("relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-7", shimmer)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Database className="h-5 w-5 text-white/75" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">Model pricing (animated)</div>
              <div className="text-sm text-white/60">Switch models — costs reflow instantly.</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRICING.map((m) => {
              const active = m.key === selectedModel;
              return (
                <button
                  key={m.key}
                  onClick={() => onChangeModel(m.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={model.key}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                <div className="text-xs text-white/60">Input price</div>
                <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                  ${model.inputPer1M.toFixed(2)}{" "}
                  <span className="text-sm text-white/55">/ 1M</span>
                </div>
                <div className="mt-1 text-[11px] text-white/45">prompt tokens</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                <div className="text-xs text-white/60">Output price</div>
                <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                  ${model.outputPer1M.toFixed(2)}{" "}
                  <span className="text-sm text-white/55">/ 1M</span>
                </div>
                <div className="mt-1 text-[11px] text-white/45">completion tokens</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">Example workloads</div>
                <Pill className="text-white/70">
                  <Wallet className="h-3.5 w-3.5" />
                  cost preview
                </Pill>
              </div>

              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/35">
                <table className="min-w-[640px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/55">
                      <th className="px-4 py-3">Workload</th>
                      <th className="px-4 py-3">Prompt</th>
                      <th className="px-4 py-3">Completion</th>
                      <th className="px-4 py-3">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workloads.map((w) => {
                      const usd = w.prompt * inUsdPerToken + w.out * outUsdPerToken;
                      const cents = Math.round(usd * 100);
                      return (
                        <tr key={w.name} className="border-t border-white/10 text-white/75">
                          <td className="px-4 py-3 font-medium text-white/80">{w.name}</td>
                          <td className="px-4 py-3 tabular-nums">{formatInt(w.prompt)}</td>
                          <td className="px-4 py-3 tabular-nums">{formatInt(w.out)}</td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-white">{formatUsd(cents)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[11px] text-white/45">
                In production, Forsig reads these rates from your DB and settles using actual usage returned.
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: why it matters */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Radar className="h-5 w-5 text-white/75" />
          </div>
          <div>
            <div className="text-base font-semibold text-white">Why DB pricing matters</div>
            <div className="text-sm text-white/60">Accuracy is a trust feature.</div>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm text-white/70">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Database className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">One source of truth</div>
              <div className="text-white/60">Update a model’s rate once — all calculations follow.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Lock className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">Fewer “gotchas”</div>
              <div className="text-white/60">No drifting env values. No mismatched dashboards.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <LineChart className="h-4 w-4 text-white/70" />
            </span>
            <div>
              <div className="font-medium text-white">Auditable to the cent</div>
              <div className="text-white/60">Reserve/settle values match what you store & report.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/45 p-4">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <BadgeCheck className="h-4 w-4" />
            <span>Premium UX rule</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            The UI should show what operators care about: policy outcomes, pricing truth, and audit coverage.
          </p>
        </div>
      </div>
    </div>
  );
}

/** ----------------------------
 *  (3) Scroll-driven storyline (product trailer)
 *  Sticky panel + scroll progress animations
 *  ---------------------------- */
function ScrollStory() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const prog = useSpring(scrollYProgress, { stiffness: 120, damping: 22 });
  const barScale = useTransform(prog, [0, 1], [0, 1]);

  // Map progress to "scene" index (0..3)
  const sceneRaw = useTransform(prog, [0, 1], [0, 3]);
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const unsub = sceneRaw.on("change", (v) => setScene(clamp(Math.round(v), 0, 3)));
    return () => unsub();
  }, [sceneRaw]);

  const scenes = useMemo(
    () => [
      {
        k: "keys",
        title: "Issue allowance keys",
        desc: "Give teams scoped keys with budgets. Let them build fast without spend anxiety.",
        bullets: ["Least-privilege access", "Per-key budget caps", "Model allowlists"],
        icon: KeyRound,
      },
      {
        k: "preflight",
        title: "Reserve preflight",
        desc: "Forsig reserves prompt + max_output before execution. If budget fails, it blocks early.",
        bullets: ["Predictable caps", "Early fail-fast", "No runaway completions"],
        icon: Gauge,
      },
      {
        k: "settle",
        title: "Settle exact usage",
        desc: "After provider usage returns, Forsig settles precise cost using DB model pricing.",
        bullets: ["DB is source of truth", "Per-model input/output", "Accurate to cents"],
        icon: Wallet,
      },
      {
        k: "audit",
        title: "Audit everything",
        desc: "Every request is logged: spend, tokens, request metadata, and outcomes.",
        bullets: ["Operator clarity", "Exportable metrics", "Trustworthy reporting"],
        icon: LineChart,
      },
    ],
    []
  );

  const active = scenes[scene];

  return (
    <div ref={ref} className="relative mt-10">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left scroll text blocks */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-hidden">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Blocks className="h-4 w-4" />
                <span>Product trailer</span>
              </div>
              <Pill className="text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                scroll to play
              </Pill>
            </div>

            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
                <motion.div
                  style={{ scaleX: barScale, transformOrigin: "0% 50%" }}
                  className="h-full w-full rounded-full bg-white/60"
                />
              </div>
              <div className="mt-2 text-[11px] text-white/45">
                Each step explains Forsig’s core promise: control, accuracy, audit.
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {scenes.map((s, idx) => {
                const Icon = s.icon;
                const isActive = idx === scene;
                return (
                  <motion.div
                    key={s.k}
                    className={cn(
                      "rounded-2xl border p-4 transition",
                      isActive
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/10 bg-white/[0.02]"
                    )}
                    animate={{ opacity: isActive ? 1 : 0.6 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                        <Icon className="h-5 w-5 text-white/75" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{s.title}</div>
                        <div className="text-xs text-white/55">{s.desc}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sticky scene panel */}
        <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          <div className={cn("relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-7", shimmer)}>
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

            <AnimatePresence mode="wait">
              <motion.div
                key={active.k}
                initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <active.icon className="h-6 w-6 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">{active.title}</div>
                    <div className="text-sm text-white/60">{active.desc}</div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {active.bullets.map((b) => (
                    <div
                      key={b}
                      className="rounded-2xl border border-white/10 bg-black/45 p-4 text-sm text-white/75"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                          <Check className="h-3.5 w-3.5 text-white/70" />
                        </span>
                        <span>{b}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* mini "system view" */}
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/55 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Cable className="h-4 w-4" />
                      <span>System view</span>
                    </div>
                    <Pill className="text-white/70">
                      <Shield className="h-3.5 w-3.5" />
                      enforced
                    </Pill>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[11px] text-white/55">Policy</div>
                      <div className="mt-1 text-sm font-medium text-white/80">
                        {scene === 0
                          ? "Key budgets + allowlist"
                          : scene === 1
                          ? "Preflight reserve"
                          : scene === 2
                          ? "Settle exact usage"
                          : "Audit & metrics"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[11px] text-white/55">Outcome</div>
                      <div className="mt-1 text-sm font-medium text-white/80">
                        {scene === 0
                          ? "Scoped access issued"
                          : scene === 1
                          ? "Budget checked early"
                          : scene === 2
                          ? "Cost computed from DB"
                          : "Visible spend trail"}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Spacer to create scroll length on small screens */}
          <div className="mt-6 h-[70vh] lg:h-[160vh]" />
        </div>
      </div>
    </div>
  );
}

function FeatureGrid() {
  const features = [
    { icon: KeyRound, title: "Allowance keys", desc: "Issue scoped keys that enforce spend rules at the edge." },
    { icon: Wallet, title: "DB-based pricing", desc: "Every model priced from your database — accurate per-token settlement." },
    { icon: Shield, title: "Policy enforcement", desc: "Reserve preflight, then settle exact usage — no guessing." },
    { icon: LineChart, title: "Audit clarity", desc: "Spend, requests, prompt tokens, completion tokens — visible and exportable." },
    { icon: Radar, title: "Model routing", desc: "Let users choose approved models while you keep control." },
    { icon: Lock, title: "Safer defaults", desc: "Design for least-privilege keys and explicit budgets." },
  ];

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f, i) => {
        const Icon = f.icon;
        return (
          <motion.div
            key={f.title}
            variants={fadeUp}
            custom={0.08 * i}
            className={cn("group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] p-6", shimmer)}
          >
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/15" />
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Icon className="h-5 w-5 text-white/70" />
              </div>
              <div className="text-base font-semibold text-white">{f.title}</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{f.desc}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function HeroStoryCard() {
  const [tab, setTab] = useState<"edge" | "pricing" | "audit">("edge");

  const tabs = useMemo(
    () => [
      { id: "edge", label: "Edge Proxy", icon: Cable },
      { id: "pricing", label: "DB Pricing", icon: Wallet },
      { id: "audit", label: "Audit", icon: LineChart },
    ],
    []
  );

  const snippets: Record<typeof tab, string> = {
    edge: `POST /v1/chat/completions
Authorization: Bearer FORSIG_ALLOWANCE_KEY

→ Routes to allowed model
→ Enforces policy at edge
→ Reserves budget preflight
→ Settles exact usage`,
    pricing: `model_pricing table (DB):
- input $/1M
- output $/1M

cost = prompt_tokens × in_price
     + completion_tokens × out_price`,
    audit: `Audit dashboard:
- Total spend (cents)
- Requests
- Prompt tokens
- Completion tokens

Everything is accounted for.`,
  };

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[28px] bg-white/[0.06] blur-2xl" />
      <div className={cn("relative rounded-[28px] border border-white/10 bg-black/50 p-4 shadow-2xl", shimmer)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-2 text-xs text-white/60">forsig://overview</span>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === (t.id as any);
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1 text-xs transition",
                    active ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Live policy</span>
              <Pill className="text-white/70">
                <Shield className="h-3.5 w-3.5" />
                Enforced
              </Pill>
            </div>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-white/60" />
                Allowance keys
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-white/60" />
                Preflight reserve & settle
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-white/60" />
                DB model pricing
              </div>
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-white/60" />
                Full audit trail
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Request story</span>
              <Pill className="text-white/70">
                <Zap className="h-3.5 w-3.5" />
                1 API call
              </Pill>
            </div>

            <motion.pre
              key={tab}
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-3 overflow-hidden whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed text-white/75"
            >
              {snippets[tab]}
            </motion.pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  // subtle parallax spotlight based on cursor
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 160, damping: 20 });
  const sy = useSpring(my, { stiffness: 160, damping: 20 });
  const bgX = useTransform(sx, (v) => `${50 + v * 0.02}%`);
  const bgY = useTransform(sy, (v) => `${20 + v * 0.02}%`);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX - window.innerWidth / 2);
      my.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  const [selectedModel, setSelectedModel] = useState<ModelKey>("gpt-4o");

  return (
    <main className="relative min-h-screen bg-black text-white">
      <Glow />
      <Noise />

      <motion.div
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(650px 400px at var(--x) var(--y), rgba(255,255,255,0.10), transparent 60%)",
          ["--x" as any]: bgX,
          ["--y" as any]: bgY,
        }}
        className="pointer-events-none absolute inset-0"
      />

      {/* Top nav */}
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
            <Zap className="h-5 w-5 text-white/80" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Forsig</div>
            <div className="text-xs text-white/50">Policy-first AI gateway</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/app"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.08] sm:inline-flex"
          >
            Dashboard
          </a>
          <Magnetic>
            <a
              href="/app"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium hover:bg-white/[0.12]",
                shimmer
              )}
            >
              Launch Forsig
              <ArrowRight className="h-4 w-4" />
            </a>
          </Magnetic>
        </div>
      </div>

      {/* Hero */}
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div initial="hidden" animate="visible" className="max-w-xl">
            <motion.div variants={fadeUp} custom={0}>
              <Pill className="border-white/15 bg-white/[0.06]">
                <span className="inline-flex h-2 w-2 rounded-full bg-white/70" />
                Edge-enforced budgets • DB-priced settlement • Full audit trail
              </Pill>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={0.08}
              className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              Make AI spend predictable.
              <span className="text-white/70"> Without slowing teams down.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={0.16}
              className="mt-5 text-pretty text-base leading-relaxed text-white/70 sm:text-lg"
            >
              Forsig is a policy-first AI gateway: issue allowance keys, approve models, reserve preflight,
              then settle exact usage using DB-based per-model pricing — with an operator-grade audit trail.
            </motion.p>

            <motion.div variants={fadeUp} custom={0.22} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Magnetic>
                <a
                  href="/app"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90",
                    shimmer
                  )}
                >
                  Start in dashboard
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Magnetic>

              <a
                href="#story"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.10]"
              >
                Watch the flow
                <Blocks className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.div variants={fadeUp} custom={0.28} className="mt-7 flex flex-wrap gap-2">
              <Pill><KeyRound className="h-3.5 w-3.5" /> Allowance keys</Pill>
              <Pill><Wallet className="h-3.5 w-3.5" /> DB pricing</Pill>
              <Pill><LineChart className="h-3.5 w-3.5" /> Audit</Pill>
              <Pill><Shield className="h-3.5 w-3.5" /> Policies</Pill>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.18}>
            <HeroStoryCard />
          </motion.div>
        </div>

        <Marquee
          items={[
            "Accurate per-model pricing",
            "Reserve → Settle flow",
            "Spend caps and rate limits",
            "Model allowlists",
            "Audit metrics",
            "Edge-friendly",
            "Premium UI dashboards",
            "Budget enforcement",
          ]}
        />
      </div>

      {/* Features */}
      <section className="relative mx-auto max-w-6xl px-5 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }}>
          <SectionTitle
            eyebrow="What Forsig stands for"
            title="Control without friction"
            desc="Forsig makes budget enforcement invisible to users and obvious to operators — accurate pricing and auditability built in."
          />
          <FeatureGrid />
        </motion.div>
      </section>

      {/* (1) Budget demo */}
      <section className="relative mx-auto max-w-6xl px-5 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }}>
          <SectionTitle
            eyebrow="Interactive demo"
            title="Drag budgets. See the system behave."
            desc="A premium product explains itself. Move the sliders and watch how Forsig reserves, settles, and audits."
          />
          <BudgetSliderDemo selectedModel={selectedModel} onChangeModel={setSelectedModel} />
        </motion.div>
      </section>

      {/* (2) Pricing table */}
      <section className="relative mx-auto max-w-6xl px-5 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }}>
          <SectionTitle
            eyebrow="Pricing truth"
            title="Model prices that feel alive"
            desc="Switch models and watch estimates adapt — mirroring DB-first pricing in the real gateway."
          />
          <PricingTable selectedModel={selectedModel} onChangeModel={setSelectedModel} />
        </motion.div>
      </section>

      {/* (3) Scroll story */}
      <section id="story" className="relative mx-auto max-w-6xl px-5 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }}>
          <SectionTitle
            eyebrow="Product trailer"
            title="Scroll through the Forsig flow"
            desc="A scroll-driven storyline: keys → preflight reserve → settle from DB → audit trail."
          />
          <ScrollStory />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative mx-auto max-w-6xl px-5 pb-10 pt-6">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Zap className="h-4 w-4" />
            <span>Forsig</span>
            <span className="text-white/35">•</span>
            <span>Policy-first AI gateway</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Guardrails
            </span>
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Accuracy
            </span>
            <span className="inline-flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Audit
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
