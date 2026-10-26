import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Search, X } from "lucide-react";
import { useRef, type ReactNode, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { fmt, hueOf, initials } from "@/lib/store";

/** Card that tilts in 3D following the pointer. */
export function Tilt({ children, className, max = 10, delay = 0 }: { children: ReactNode; className?: string; max?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(6px)`;
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div className="perspective animate-rise min-w-0" style={{ animationDelay: `${delay}ms` }}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className={cn("glass preserve-3d relative overflow-hidden rounded-3xl transition-transform duration-200 ease-out", className)}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(22rem circle at var(--gx,50%) var(--gy,0%), color-mix(in oklab, var(--foreground) 9%, transparent), transparent 55%)" }}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

/** Extruded 3D icon cube. */
export function Cube3D({ children, hue = 128, size = 56 }: { children: ReactNode; hue?: number; size?: number }) {
  const face = `oklch(0.72 0.16 ${hue})`;
  return (
    <div className="perspective shrink-0" style={{ width: size, height: size }}>
      <div
        className="preserve-3d relative grid h-full w-full place-items-center rounded-2xl text-2xl"
        style={{
          transform: "rotateX(14deg) rotateY(-16deg)",
          background: `linear-gradient(145deg, oklch(0.82 0.15 ${hue}), oklch(0.55 0.17 ${hue}))`,
          boxShadow: `6px 8px 0 -1px oklch(0.4 0.14 ${hue}), 10px 18px 26px -8px oklch(0 0 0 / 70%), inset 0 2px 0 oklch(1 0 0 / 40%)`,
          color: `oklch(0.18 0.05 ${hue})`,
          borderColor: face,
        }}
      >
        <span style={{ transform: "translateZ(14px)", filter: "drop-shadow(0 3px 2px oklch(0 0 0 / .35))" }}>{children}</span>
      </div>
    </div>
  );
}

export function Avatar3D({ name, size = 44 }: { name: string; size?: number }) {
  const h = hueOf(name);
  return (
    <div
      className="grid shrink-0 place-items-center rounded-2xl font-display text-sm font-bold"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, oklch(0.4 0.1 ${h}), oklch(0.28 0.08 ${h}))`,
        color: `oklch(0.88 0.13 ${h})`,
        boxShadow: `inset 0 1px 0 oklch(1 0 0 / 18%), 0 6px 14px -6px oklch(0 0 0 / 70%), 3px 4px 0 -1px oklch(0.2 0.06 ${h})`,
      }}
    >
      {initials(name)}
    </div>
  );
}

const chipColor = {
  cost: "text-cost bg-cost/12 ring-cost/25",
  gst: "text-gst bg-gst/12 ring-gst/25",
  sp: "text-sp bg-sp/12 ring-sp/25",
  cp: "text-cp bg-cp/12 ring-cp/25",
  profit: "text-profit bg-profit/12 ring-profit/25",
  loss: "text-destructive bg-destructive/12 ring-destructive/25",
} as const;

export function Chip({ kind, value, pct, className }: { kind: keyof typeof chipColor; value: number; pct?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-14 justify-center rounded-xl px-2 py-1.5 font-display text-xs font-semibold tabular-nums ring-1", chipColor[kind], className)}>
      {pct ? `${value}%` : fmt(value)}
    </span>
  );
}

export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1",
        status === "active" ? "bg-primary/12 text-primary ring-primary/30" : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {status}
    </span>
  );
}

export function PageHeader({ title, subtitle, back, actions, icon }: { title: string; subtitle?: string | undefined; back?: boolean; actions?: ReactNode; icon?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 -mx-3 mb-5 px-3 sm:-mx-4 sm:px-4 pb-3 pt-4 backdrop-blur-xl" style={{ background: "linear-gradient(to bottom, var(--background) 55%, transparent)" }}>
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))}
            className="glass grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {icon}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-screen w-full max-w-4xl px-3 pb-36 sm:px-4">{children}</main>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="glass flex h-12 flex-1 items-center gap-3 rounded-2xl px-4">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </label>
  );
}

export function FilterPills<T extends string>({ options, value, onChange }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
            value === o.value ? "bg-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SortSelect<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="glass h-10 shrink-0 self-start rounded-full px-3 sm:self-auto text-sm font-semibold text-foreground outline-none"
      aria-label="Sort"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-popover">
          Sort: {o.label}
        </option>
      ))}
    </select>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="glass mt-6 flex w-full flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="animate-floaty mb-4 text-5xl">📦</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-display text-sm font-bold text-primary-foreground shadow-glow transition hover:brightness-110 active:translate-y-0.5 disabled:opacity-50",
        "[box-shadow:0_5px_0_0_color-mix(in_oklab,var(--primary)_45%,black),var(--shadow-glow)] active:[box-shadow:0_1px_0_0_color-mix(in_oklab,var(--primary)_45%,black)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={cn("glass inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition active:scale-[.98]", className)}>
      {children}
    </button>
  );
}

export { Link };
