import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ChevronRight, Download, FileText, LayoutGrid, Pencil, RotateCcw, Store, Tag, Truck, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Cube3D, Page, Tilt } from "@/components/app/ui3d";
import { currentPrice, fmt, fmtDate, profitOf, stockState, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rj Store — Dashboard" },
      { name: "description", content: "Your store at a glance: categories, vendors, GST, URD and DM purchases." },
      { property: "og:title", content: "Rj Store — Dashboard" },
      { property: "og:description", content: "Your store at a glance: categories, vendors, GST, URD and DM purchases." },
    ],
  }),
  component: Home,
});

const faces = ["🍫", "🍪", "🧃", "🍟", "🥐", "🍜"];

function HeroCube() {
  const t = ["rotateY(0deg)", "rotateY(90deg)", "rotateY(180deg)", "rotateY(-90deg)", "rotateX(90deg)", "rotateX(-90deg)"];
  return (
    <div className="perspective h-28 w-28 shrink-0 animate-floaty">
      <div className="preserve-3d relative h-full w-full animate-spin3d">
        {faces.map((f, i) => (
          <div
            key={i}
            className="absolute inset-3 grid place-items-center rounded-2xl text-4xl ring-1 ring-primary/40"
            style={{ transform: `${t[i]} translateZ(44px)`, background: "linear-gradient(145deg, color-mix(in oklab, var(--primary) 30%, var(--card)), var(--card))", backfaceVisibility: "hidden" }}
          >
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const { storeName, setStoreName, categories, vendors, products, importData, resetDemo } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const low = products.filter((p) => stockState(p) !== "in");
  const avgProfit = products.length ? products.reduce((a, p) => a + profitOf(currentPrice(p)), 0) / products.length : 0;
  const recent = [...products].sort((a, b) => currentPrice(b).date.localeCompare(currentPrice(a).date)).slice(0, 5);

  const tiles = [
    { to: "/categories" as const, title: "Categories", sub: "Find products by category", icon: <LayoutGrid />, hue: 150, n: categories.length },
    { to: "/vendors" as const, title: "Vendors", sub: "Find products by vendor", icon: <Truck />, hue: 245, n: vendors.length },
    { to: "/gst" as const, title: "GST Billed", sub: "Suppliers providing GST bills", icon: <FileText />, hue: 170, n: vendors.filter((v) => v.type === "GST").length },
    { to: "/urd" as const, title: "URD", sub: "Unregistered dealers", icon: <Store />, hue: 60, n: vendors.filter((v) => v.type === "URD").length },
    { to: "/dm" as const, title: "DM", sub: "Your discounted-product purchases", icon: <Tag />, hue: 300, n: products.filter((p) => vendors.find((v) => v.id === p.vendorId)?.type === "DM").length },
  ];

  const exportData = () => {
    const blob = new Blob([JSON.stringify(useStore.getState(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rj-store-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("Backup downloaded");
  };
  const onImport = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.products) || !Array.isArray(d.vendors) || !Array.isArray(d.categories)) throw new Error();
      importData(d);
      toast.success("Backup restored");
    } catch {
      toast.error("That file isn't a valid backup");
    }
  };

  return (
    <Page>
      <Tilt className="mt-5 p-6" max={6}>
        <div className="flex items-center gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Store Manager</p>
            <button
              className="group mt-1 flex items-center gap-2 text-left"
              onClick={() => {
                const n = prompt("Store name", storeName);
                if (n?.trim()) setStoreName(n.trim());
              }}
            >
              <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{storeName}</h1>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
            <p className="mt-1 text-sm text-muted-foreground">Manage Products & Suppliers</p>
          </div>
          <HeroCube />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: "Products", v: products.length },
            { l: "Vendors", v: vendors.length },
            { l: "Avg profit", v: `₹${fmt(avgProfit)}` },
            { l: "Stock alerts", v: low.length, warn: low.length > 0 },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-background/50 p-3 ring-1 ring-border" style={{ transform: "translateZ(20px)" }}>
              <div className={`font-display text-2xl font-bold ${s.warn ? "text-cp" : ""}`}>{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </Tilt>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {tiles.map((t, i) => (
          <Link key={t.to} to={t.to} className={i === 0 ? "sm:col-span-2" : ""}>
            <Tilt className="p-4" delay={80 + i * 60}>
              <div className="flex items-center gap-4">
                <Cube3D hue={t.hue}>{t.icon}</Cube3D>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold">{t.title}</div>
                  <div className="truncate text-sm text-muted-foreground">{t.sub}</div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 font-display text-xs font-bold">{t.n}</span>
                <ChevronRight className="h-5 w-5" style={{ color: `oklch(0.8 0.15 ${t.hue})` }} />
              </div>
            </Tilt>
          </Link>
        ))}
      </div>

      {low.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Bell className="h-4 w-4 text-cp" /> Stock alerts</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {low.map((p) => (
              <Link key={p.id} to="/products/$productId" params={{ productId: p.id }} className="glass w-40 shrink-0 rounded-2xl p-3">
                <div className="text-3xl">{p.emoji}</div>
                <div className="mt-2 truncate text-sm font-semibold">{p.name}</div>
                <div className={`text-xs font-bold ${p.stock <= 0 ? "text-destructive" : "text-cp"}`}>{p.stock <= 0 ? "Out of stock" : `Only ${p.stock} left`}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Recent price updates</h2>
        <div className="space-y-2">
          {recent.map((p) => {
            const c = currentPrice(p);
            return (
              <Link key={p.id} to="/products/$productId" params={{ productId: p.id }} className="glass flex items-center gap-3 rounded-2xl p-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(c.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-bold">₹{fmt(c.sp)}</div>
                  <div className="text-xs text-profit">+₹{fmt(profitOf(c))}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Backup</h2>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportData} className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-xs font-semibold"><Download className="h-5 w-5 text-primary" />Export</button>
          <button onClick={() => fileRef.current?.click()} className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-xs font-semibold"><Upload className="h-5 w-5 text-accent" />Import</button>
          <button
            onClick={() => confirm("Reset to sample data? Your changes will be lost.") && (resetDemo(), toast.success("Sample data restored"))}
            className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-xs font-semibold"
          >
            <RotateCcw className="h-5 w-5 text-destructive" />Reset
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} />
        <p className="mt-2 text-xs text-muted-foreground">Data is saved on this device. Export a backup to keep it safe.</p>
      </section>
    </Page>
  );
}
