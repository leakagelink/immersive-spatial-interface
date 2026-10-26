import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Download, LayoutGrid, Package, Pencil, Plus, RotateCcw, Settings, Trash2, Truck, Upload } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EMOJIS, Field, inputCls, ProductDialog, VendorDialog } from "@/components/app/forms";
import { Avatar3D, Cube3D, FilterPills, GhostButton, Page, PageHeader, PrimaryButton, SearchBox, StatusBadge } from "@/components/app/ui3d";
import {
  applyBulkPrice, currentPrice, fmt, marginOf, profitOf, stockState, today, useStore,
  type BulkField, type BulkMode, type Category, type Product, type Vendor, type VendorType,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel — Rj Store" },
      { name: "description", content: "Manage products, vendors, categories, bulk prices, reports and store settings." },
      { property: "og:title", content: "Admin Panel — Rj Store" },
      { property: "og:description", content: "Manage everything in your store from one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Tab = "reports" | "products" | "vendors" | "categories" | "settings";
const tabs: { v: Tab; l: string; i: typeof Package }[] = [
  { v: "reports", l: "Reports", i: BarChart3 },
  { v: "products", l: "Products", i: Package },
  { v: "vendors", l: "Vendors", i: Truck },
  { v: "categories", l: "Categories", i: LayoutGrid },
  { v: "settings", l: "Settings", i: Settings },
];

function Admin() {
  const [tab, setTab] = useState<Tab>("reports");
  return (
    <Page>
      <PageHeader title="Admin Panel" subtitle="Manage everything in your store" back />
      <div className="-mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {tabs.map(({ v, l, i: I }) => (
          <button key={v} onClick={() => setTab(v)} className={cn("flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition", tab === v ? "bg-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground")}>
            <I className="h-4 w-4" />{l}
          </button>
        ))}
      </div>
      {tab === "reports" && <Reports />}
      {tab === "products" && <ProductsAdmin />}
      {tab === "vendors" && <VendorsAdmin />}
      {tab === "categories" && <CategoriesAdmin />}
      {tab === "settings" && <SettingsAdmin />}
    </Page>
  );
}

/* ---------------- Reports ---------------- */
function Stat({ l, v, c }: { l: string; v: string | number; c?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={cn("font-display text-xl font-bold sm:text-2xl", c)}>{v}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
    </div>
  );
}

function Bar({ label, value, max, right, hue }: { label: string; value: number; max: number; right: string; hue: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate">{label}</span><span className="shrink-0 font-semibold tabular-nums">{right}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-background/60">
        <div className="h-full rounded-full" style={{ width: `${max ? Math.max(3, (value / max) * 100) : 0}%`, background: `linear-gradient(90deg, oklch(0.6 0.15 ${hue}), oklch(0.85 0.17 ${hue}))` }} />
      </div>
    </div>
  );
}

function Reports() {
  const { products, vendors, categories } = useStore();
  const r = useMemo(() => {
    const stockValue = products.reduce((a, p) => a + currentPrice(p).cost * Math.max(0, p.stock), 0);
    const potProfit = products.reduce((a, p) => a + profitOf(currentPrice(p)) * Math.max(0, p.stock), 0);
    const avgMargin = products.length ? products.reduce((a, p) => a + marginOf(currentPrice(p)), 0) / products.length : 0;
    const byVendor = vendors.map((v) => {
      const ps = products.filter((p) => p.vendorId === v.id);
      return { v, n: ps.length, profit: ps.reduce((a, p) => a + profitOf(currentPrice(p)) * Math.max(0, p.stock), 0) };
    }).filter((x) => x.n).sort((a, b) => b.profit - a.profit);
    const byCat = categories.map((c) => ({ c, n: products.filter((p) => p.categoryId === c.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    const top = [...products].sort((a, b) => profitOf(currentPrice(b)) - profitOf(currentPrice(a))).slice(0, 5);
    const st = { in: 0, low: 0, out: 0 };
    products.forEach((p) => st[stockState(p)]++);
    const types: Record<VendorType, number> = { GST: 0, URD: 0, DM: 0 };
    vendors.forEach((v) => types[v.type]++);
    return { stockValue, potProfit, avgMargin, byVendor, byCat, top, st, types };
  }, [products, vendors, categories]);
  const maxV = Math.max(...r.byVendor.map((x) => x.profit), 0);
  const maxC = Math.max(...r.byCat.map((x) => x.n), 0);
  const maxT = Math.max(...r.top.map((p) => profitOf(currentPrice(p))), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat l="Stock value (cost)" v={`₹${fmt(r.stockValue)}`} />
        <Stat l="Profit if all stock sells" v={`₹${fmt(r.potProfit)}`} c="text-profit" />
        <Stat l="Average margin" v={`${r.avgMargin.toFixed(1)}%`} />
        <Stat l="Products / Vendors" v={`${products.length} / ${vendors.length}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-bold">Stock status</h3>
          <Bar label="In stock" value={r.st.in} max={products.length} right={String(r.st.in)} hue={150} />
          <Bar label="Low stock" value={r.st.low} max={products.length} right={String(r.st.low)} hue={70} />
          <Bar label="Out of stock" value={r.st.out} max={products.length} right={String(r.st.out)} hue={25} />
          <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
            <span className="glass rounded-full px-3 py-1">GST: {r.types.GST}</span>
            <span className="glass rounded-full px-3 py-1">URD: {r.types.URD}</span>
            <span className="glass rounded-full px-3 py-1">DM: {r.types.DM}</span>
          </div>
        </section>
        <section className="glass space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-bold">Top 5 profit per piece</h3>
          {r.top.map((p) => <Bar key={p.id} label={`${p.emoji} ${p.name}`} value={profitOf(currentPrice(p))} max={maxT} right={`₹${fmt(profitOf(currentPrice(p)))}`} hue={128} />)}
        </section>
        <section className="glass space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-bold">Vendor-wise profit (on stock)</h3>
          {r.byVendor.map((x) => <Bar key={x.v.id} label={`${x.v.name} · ${x.n} items`} value={x.profit} max={maxV} right={`₹${fmt(x.profit)}`} hue={245} />)}
        </section>
        <section className="glass space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-bold">Products per category</h3>
          {r.byCat.map((x) => <Bar key={x.c.id} label={`${x.c.icon} ${x.c.name}`} value={x.n} max={maxC} right={String(x.n)} hue={x.c.hue} />)}
        </section>
      </div>
    </div>
  );
}

/* ---------------- shared ---------------- */
function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Select" className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black ring-1", on ? "bg-primary text-primary-foreground ring-primary" : "ring-border")}>
      {on ? "✓" : ""}
    </button>
  );
}

function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null;
  return (
    <div className="glass sticky top-24 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl p-2 ring-1 ring-primary/40">
      <span className="px-2 text-sm font-bold">{count} selected</span>
      <button onClick={onClear} className="text-xs text-muted-foreground underline">Clear</button>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const smallBtn = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold";

function useSelection() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return { sel, toggle, setAll: (ids: string[]) => setSel(new Set(ids)), clear: () => setSel(new Set()) };
}

/* ---------------- Products ---------------- */
function ProductsAdmin() {
  const { products, vendors, categories, deleteProduct, updateProduct, addPrice } = useStore();
  const [q, setQ] = useState("");
  const [vf, setVf] = useState("all");
  const [cf, setCf] = useState("all");
  const { sel, toggle, setAll, clear } = useSelection();
  const [edit, setEdit] = useState<Product | undefined>();
  const [open, setOpen] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const list = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()) && (vf === "all" || p.vendorId === vf) && (cf === "all" || p.categoryId === cf));
  const allOn = list.length > 0 && list.every((p) => sel.has(p.id));
  const ids = [...sel];

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search products…" />
        <PrimaryButton className="shrink-0 px-4" onClick={() => { setEdit(undefined); setOpen(true); }}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Product</span></PrimaryButton>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <select value={vf} onChange={(e) => setVf(e.target.value)} className={cn(inputCls, "h-11")} aria-label="Vendor filter">
          <option value="all" className="bg-popover">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id} className="bg-popover">{v.name}</option>)}
        </select>
        <select value={cf} onChange={(e) => setCf(e.target.value)} className={cn(inputCls, "h-11")} aria-label="Category filter">
          <option value="all" className="bg-popover">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id} className="bg-popover">{c.name}</option>)}
        </select>
      </div>
      <BulkBar count={sel.size} onClear={clear}>
        <button className={cn(smallBtn, "bg-primary text-primary-foreground")} onClick={() => setBulk(true)}>₹ Update prices</button>
        <button className={cn(smallBtn, "glass")} onClick={() => setStockOpen(true)}>Set stock</button>
        <button className={cn(smallBtn, "bg-destructive text-destructive-foreground")} onClick={() => {
          if (!confirm(`Delete ${ids.length} products?`)) return;
          ids.forEach(deleteProduct); clear(); toast.success("Products deleted");
        }}><Trash2 className="h-3.5 w-3.5" />Delete</button>
      </BulkBar>
      <div className="mb-2 flex items-center gap-3 px-3 text-xs font-bold uppercase text-muted-foreground">
        <Check on={allOn} onClick={() => (allOn ? clear() : setAll(list.map((p) => p.id)))} />
        <span>Select all ({list.length})</span>
      </div>
      <div className="space-y-2">
        {list.map((p) => {
          const c = currentPrice(p);
          const v = vendors.find((x) => x.id === p.vendorId);
          return (
            <div key={p.id} className={cn("glass flex items-center gap-3 rounded-2xl p-3", sel.has(p.id) && "ring-1 ring-primary/60")}>
              <Check on={sel.has(p.id)} onClick={() => toggle(p.id)} />
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-xl">{p.emoji}</span>
              <Link to="/products/$productId" params={{ productId: p.id }} className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{v?.name ?? "—"} · Stock {p.stock}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] tabular-nums">
                  <span className="text-cost">C ₹{fmt(c.cost)}</span><span className="text-sp">SP ₹{fmt(c.sp)}</span><span className="text-profit">P ₹{fmt(profitOf(c))}</span>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <button aria-label="Stock minus" onClick={() => updateProduct(p.id, { stock: Math.max(0, p.stock - 1) })} className="glass hidden h-8 w-8 rounded-lg text-sm font-bold sm:block">−</button>
                <button aria-label="Stock plus" onClick={() => updateProduct(p.id, { stock: p.stock + 1 })} className="glass hidden h-8 w-8 rounded-lg text-sm font-bold sm:block">+</button>
                <button aria-label="Edit" onClick={() => { setEdit(p); setOpen(true); }} className="glass grid h-8 w-8 place-items-center rounded-lg"><Pencil className="h-3.5 w-3.5" /></button>
                <button aria-label="Delete" onClick={() => confirm(`Delete ${p.name}?`) && (deleteProduct(p.id), toast.success("Deleted"))} className="glass grid h-8 w-8 place-items-center rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>
      <ProductDialog key={edit?.id ?? "new"} open={open} onOpenChange={setOpen} {...(edit ? { product: edit } : {})} />
      <BulkPriceDialog open={bulk} onOpenChange={setBulk} onApply={(field, mode, value, date) => {
        products.filter((p) => sel.has(p.id)).forEach((p) => addPrice(p.id, applyBulkPrice(currentPrice(p), field, mode, value, date)));
        toast.success(`Prices updated for ${sel.size} products`); clear(); setBulk(false);
      }} />
      <StockDialog open={stockOpen} onOpenChange={setStockOpen} onApply={(n) => { ids.forEach((id) => updateProduct(id, { stock: n })); toast.success("Stock updated"); clear(); setStockOpen(false); }} />
    </div>
  );
}

function BulkPriceDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (f: BulkField, m: BulkMode, v: number, d: string) => void }) {
  const [field, setField] = useState<BulkField>("both");
  const [mode, setMode] = useState<BulkMode>("pct");
  const [val, setVal] = useState("");
  const [date, setDate] = useState(today());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-popover">
        <DialogHeader><DialogTitle className="font-display">Bulk price update</DialogTitle></DialogHeader>
        <Field label="Change"><FilterPills value={field} onChange={setField} options={[{ value: "both", label: "Cost + SP" }, { value: "cost", label: "Cost only" }, { value: "sp", label: "SP only" }]} /></Field>
        <Field label="By"><FilterPills value={mode} onChange={setMode} options={[{ value: "pct", label: "Percent %" }, { value: "amt", label: "Amount ₹" }]} /></Field>
        <Field label={mode === "pct" ? "Percent (use − to decrease)" : "Amount ₹ (use − to decrease)"} required>
          <input className={inputCls} type="number" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder={mode === "pct" ? "e.g. 10" : "e.g. 5"} />
        </Field>
        <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <p className="text-xs text-muted-foreground">A new price entry is added to each product's history; old prices stay.</p>
        <PrimaryButton onClick={() => { const n = Number(val); if (!val || Number.isNaN(n)) { toast.error("Enter a number"); return; } onApply(field, mode, n, date || today()); setVal(""); }}>Apply</PrimaryButton>
      </DialogContent>
    </Dialog>
  );
}

function StockDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (n: number) => void }) {
  const [v, setV] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border bg-popover">
        <DialogHeader><DialogTitle className="font-display">Set stock for selected</DialogTitle></DialogHeader>
        <Field label="Stock quantity" required><input className={inputCls} type="number" inputMode="numeric" min={0} value={v} onChange={(e) => setV(e.target.value)} /></Field>
        <PrimaryButton onClick={() => { const n = Number(v); if (v === "" || n < 0) { toast.error("Enter a valid quantity"); return; } onApply(Math.floor(n)); setV(""); }}>Save</PrimaryButton>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Vendors ---------------- */
function VendorsAdmin() {
  const { vendors, products, deleteVendor, updateVendor } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | VendorType>("all");
  const { sel, toggle, setAll, clear } = useSelection();
  const [edit, setEdit] = useState<Vendor | undefined>();
  const [open, setOpen] = useState(false);
  const list = vendors.filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase()) && (type === "all" || v.type === type));
  const allOn = list.length > 0 && list.every((v) => sel.has(v.id));
  const ids = [...sel];
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search vendors…" />
        <PrimaryButton className="shrink-0 px-4" onClick={() => { setEdit(undefined); setOpen(true); }}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Vendor</span></PrimaryButton>
      </div>
      <div className="mb-3"><FilterPills value={type} onChange={setType} options={[{ value: "all", label: "All", count: vendors.length }, { value: "GST", label: "GST" }, { value: "URD", label: "URD" }, { value: "DM", label: "DM" }]} /></div>
      <BulkBar count={sel.size} onClear={clear}>
        <button className={cn(smallBtn, "glass")} onClick={() => { ids.forEach((id) => updateVendor(id, { status: "active" })); clear(); toast.success("Marked active"); }}>Active</button>
        <button className={cn(smallBtn, "glass")} onClick={() => { ids.forEach((id) => updateVendor(id, { status: "inactive" })); clear(); toast.success("Marked inactive"); }}>Inactive</button>
        <button className={cn(smallBtn, "bg-destructive text-destructive-foreground")} onClick={() => {
          if (!confirm(`Delete ${ids.length} vendors and all their products?`)) return;
          ids.forEach(deleteVendor); clear(); toast.success("Vendors deleted");
        }}><Trash2 className="h-3.5 w-3.5" />Delete</button>
      </BulkBar>
      <div className="mb-2 flex items-center gap-3 px-3 text-xs font-bold uppercase text-muted-foreground">
        <Check on={allOn} onClick={() => (allOn ? clear() : setAll(list.map((v) => v.id)))} /><span>Select all ({list.length})</span>
      </div>
      <div className="space-y-2">
        {list.map((v) => (
          <div key={v.id} className={cn("glass flex items-center gap-3 rounded-2xl p-3", sel.has(v.id) && "ring-1 ring-primary/60")}>
            <Check on={sel.has(v.id)} onClick={() => toggle(v.id)} />
            <Avatar3D name={v.name} size={40} />
            <Link to="/vendors/$vendorId" params={{ vendorId: v.id }} className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{v.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{v.type} · {products.filter((p) => p.vendorId === v.id).length} items{v.phone ? ` · ${v.phone}` : ""}</div>
            </Link>
            <button onClick={() => updateVendor(v.id, { status: v.status === "active" ? "inactive" : "active" })} className="hidden sm:block" aria-label="Toggle status"><StatusBadge status={v.status} /></button>
            <button aria-label="Edit" onClick={() => { setEdit(v); setOpen(true); }} className="glass grid h-8 w-8 shrink-0 place-items-center rounded-lg"><Pencil className="h-3.5 w-3.5" /></button>
            <button aria-label="Delete" onClick={() => confirm(`Delete ${v.name} and its products?`) && (deleteVendor(v.id), toast.success("Deleted"))} className="glass grid h-8 w-8 shrink-0 place-items-center rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <VendorDialog key={edit?.id ?? "new"} open={open} onOpenChange={setOpen} {...(edit ? { vendor: edit } : {})} />
    </div>
  );
}

/* ---------------- Categories ---------------- */
function CategoriesAdmin() {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useStore();
  const [edit, setEdit] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const start = (c: Category | null) => { setEdit(c); setName(c?.name ?? ""); setIcon(c?.icon ?? "📦"); setOpen(true); };
  const save = () => {
    if (!name.trim()) { toast.error("Category name is required"); return; }
    if (edit) updateCategory(edit.id, { name: name.trim(), icon });
    else addCategory({ name: name.trim(), icon, hue: Math.floor(Math.random() * 360) });
    toast.success(edit ? "Category updated" : "Category added"); setOpen(false);
  };
  return (
    <div>
      <PrimaryButton className="mb-4 w-full sm:w-auto" onClick={() => start(null)}><Plus className="h-4 w-4" />Add Category</PrimaryButton>
      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="glass flex items-center gap-3 rounded-2xl p-3">
            <Cube3D hue={c.hue} size={44}>{c.icon}</Cube3D>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{products.filter((p) => p.categoryId === c.id).length} products</div>
            </div>
            <button aria-label="Edit" onClick={() => start(c)} className="glass grid h-8 w-8 shrink-0 place-items-center rounded-lg"><Pencil className="h-3.5 w-3.5" /></button>
            <button aria-label="Delete" onClick={() => confirm(`Delete ${c.name}? Products stay but lose this category.`) && (deleteCategory(c.id), toast.success("Deleted"))} className="glass grid h-8 w-8 shrink-0 place-items-center rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-popover">
          <DialogHeader><DialogTitle className="font-display">{edit ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <Field label="Name" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => <button key={e} onClick={() => setIcon(e)} className={cn("grid h-10 w-10 place-items-center rounded-xl text-xl", icon === e ? "bg-primary/20 ring-2 ring-primary" : "glass")}>{e}</button>)}
            </div>
          </Field>
          <PrimaryButton onClick={save}>Save</PrimaryButton>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsAdmin() {
  const { storeName, setStoreName, importData, resetDemo, clearAll } = useStore();
  const [n, setN] = useState(storeName);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportData = () => {
    const blob = new Blob([JSON.stringify(useStore.getState(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rj-store-backup-${today()}.json`;
    a.click();
    toast.success("Backup downloaded");
  };
  const exportCsv = () => {
    const s = useStore.getState();
    const rows = [["Product", "Vendor", "Category", "Stock", "Cost", "GST %", "SP", "CP", "Profit", "Date"]];
    s.products.forEach((p) => {
      const c = currentPrice(p);
      rows.push([p.name, s.vendors.find((v) => v.id === p.vendorId)?.name ?? "", s.categories.find((x) => x.id === p.categoryId)?.name ?? "", String(p.stock), fmt(c.cost), String(c.gst), fmt(c.sp), c.cp ? fmt(c.cp) : "", fmt(profitOf(c)), c.date]);
    });
    const csv = rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `rj-store-products-${today()}.csv`;
    a.click();
    toast.success("Excel/CSV file downloaded");
  };
  const onImport = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.products) || !Array.isArray(d.vendors) || !Array.isArray(d.categories)) throw new Error();
      importData(d); toast.success("Backup restored");
    } catch { toast.error("That file isn't a valid backup"); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass space-y-3 rounded-3xl p-5">
        <h3 className="font-display font-bold">Store details</h3>
        <Field label="Store name"><input className={inputCls} value={n} onChange={(e) => setN(e.target.value)} /></Field>
        <PrimaryButton onClick={() => { if (!n.trim()) return toast.error("Name required"); setStoreName(n.trim()); toast.success("Saved"); }}>Save</PrimaryButton>
      </section>
      <section className="glass space-y-3 rounded-3xl p-5">
        <h3 className="font-display font-bold">Backup & export</h3>
        <div className="grid grid-cols-2 gap-2">
          <GhostButton onClick={exportData}><Download className="h-4 w-4 text-primary" />Backup</GhostButton>
          <GhostButton onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 text-accent" />Restore</GhostButton>
          <GhostButton className="col-span-2" onClick={exportCsv}><Download className="h-4 w-4 text-sp" />Download products (Excel/CSV)</GhostButton>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} />
      </section>
      <section className="glass space-y-3 rounded-3xl p-5 ring-1 ring-destructive/30 lg:col-span-2">
        <h3 className="font-display font-bold text-destructive">Danger zone</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <GhostButton onClick={() => confirm("Reset to sample data? Your changes will be lost.") && (resetDemo(), toast.success("Sample data restored"))}><RotateCcw className="h-4 w-4" />Reset to sample data</GhostButton>
          <GhostButton className="text-destructive" onClick={() => confirm("Delete ALL vendors, products and categories?") && (clearAll(), toast.success("Everything deleted"))}><Trash2 className="h-4 w-4" />Delete all data</GhostButton>
        </div>
      </section>
    </div>
  );
}
