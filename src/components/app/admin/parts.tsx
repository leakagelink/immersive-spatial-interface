import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const smallBtn = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold";

export function Stat({ l, v, c, hint }: { l: string; v: string | number; c?: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={cn("font-display text-xl font-bold tabular-nums sm:text-2xl", c)}>{v}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Bar({ label, value, max, right, hue }: { label: string; value: number; max: number; right: string; hue: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{right}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full rounded-full"
          style={{ width: `${max ? Math.max(3, (value / max) * 100) : 0}%`, background: `linear-gradient(90deg, oklch(0.6 0.15 ${hue}), oklch(0.85 0.17 ${hue}))` }}
        />
      </div>
    </div>
  );
}

export function Section({
  title,
  hint,
  children,
  className,
  action,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("glass space-y-3 rounded-3xl p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Select"
      className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black ring-1", on ? "bg-primary text-primary-foreground ring-primary" : "ring-border")}
    >
      {on ? "✓" : ""}
    </button>
  );
}

export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null;
  return (
    <div className="glass sticky top-24 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl p-2 ring-1 ring-primary/40">
      <span className="px-2 text-sm font-bold">{count} selected</span>
      <button onClick={onClear} className="text-xs text-muted-foreground underline">
        Clear
      </button>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function useSelection() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return { sel, toggle, setAll: (ids: string[]) => setSel(new Set(ids)), clear: () => setSel(new Set()) };
}

export function Row({ children, on, delay = 0 }: { children: ReactNode; on?: boolean; delay?: number }) {
  return (
    <div
      className={cn("glass animate-rise flex items-center gap-3 rounded-2xl p-3", on && "ring-1 ring-primary/60")}
      style={{ animationDelay: `${Math.min(delay, 12) * 25}ms` }}
    >
      {children}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "info"; children: ReactNode }) {
  const map = {
    good: "bg-profit/12 text-profit ring-profit/30",
    warn: "bg-cp/12 text-cp ring-cp/30",
    bad: "bg-destructive/12 text-destructive ring-destructive/30",
    info: "bg-sp/12 text-sp ring-sp/30",
  } as const;
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", map[tone])}>{children}</span>;
}
