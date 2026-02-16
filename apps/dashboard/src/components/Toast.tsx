"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export function Toast({
  open,
  kind,
  title,
  message,
  onClose,
}: {
  open: boolean;
  kind: ToastKind;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  const Icon = useMemo(() => {
    if (kind === "success") return CheckCircle2;
    if (kind === "error") return AlertTriangle;
    return AlertTriangle;
  }, [kind]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] mx-auto flex max-w-6xl px-4">
      <div className="ui-card flex w-full items-start gap-3 p-4 sm:w-auto sm:min-w-[420px]">
        <span
          className={
            "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border " +
            (kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : kind === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-white/10 bg-white/[0.04] text-zinc-200")
          }
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          {title ? <div className="text-sm font-semibold text-white">{title}</div> : null}
          <div className="mt-0.5 text-sm text-zinc-300">{message}</div>
        </div>

        <button className="ui-btn ml-auto px-2 py-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast(timeoutMs = 2500) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ToastKind>("info");
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), timeoutMs);
    return () => clearTimeout(t);
  }, [open, timeoutMs]);

  return {
    toast: (next: { kind?: ToastKind; title?: string; message: string }) => {
      setKind(next.kind ?? "info");
      setTitle(next.title);
      setMessage(next.message);
      setOpen(true);
    },
    toastProps: {
      open,
      kind,
      title,
      message,
      onClose: () => setOpen(false),
    },
  } as const;
}
