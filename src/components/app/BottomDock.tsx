import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Package, Plus, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/vendors/new", label: "Add", icon: Plus, main: true },
  { to: "/vendors", label: "Vendors", icon: Truck },
  { to: "/products", label: "Products", icon: Package },
] as const;

export function BottomDock() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-[min(94vw,30rem)] items-end justify-between rounded-[2rem] glass px-3 py-2 perspective">
      {items.map((it) => {
        const active = it.to === "/" ? path === "/" : path === it.to || (path.startsWith(it.to + "/") && !(it.to === "/vendors" && path === "/vendors/new"));
        const Icon = it.icon;
        if ("main" in it) {
          return (
            <Link
              key={it.to}
              to={it.to}
              aria-label="Add vendor and product"
              className="-mt-8 mx-1 grid h-14 w-14 shrink-0 sm:h-16 sm:w-16 place-items-center rounded-[1.4rem] bg-primary text-primary-foreground transition active:translate-y-1"
              style={{ transform: "rotateX(18deg)", boxShadow: "0 7px 0 0 color-mix(in oklab, var(--primary) 40%, black), var(--shadow-glow)" }}
            >
              <Icon className="h-7 w-7" strokeWidth={2.6} />
            </Link>
          );
        }
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold transition", active ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className={cn("h-5 w-5 transition", active && "-translate-y-0.5 drop-shadow-[0_4px_8px_var(--primary)]")} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
