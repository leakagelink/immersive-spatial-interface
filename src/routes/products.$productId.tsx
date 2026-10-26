import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Minus, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PriceDialog, ProductDialog } from "@/components/app/forms";
import { Chip, Empty, GhostButton, Page, PageHeader, PrimaryButton, Tilt } from "@/components/app/ui3d";
import { currentPrice, fmt, fmtDate, marginOf, profitOf, sortedHistory, stockState, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({
    meta: [
      { title: "Product — Rj Store" },
      { name: "description", content: "Current price, full price history, details and bills for this product." },
      { property: "og:title", content: "Product — Rj Store" },
      { property: "og:description", content: "Price history, details and bills." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const nav = useNavigate();
  const { products, vendors, categories, deleteProduct, deletePrice, updateProduct } = useStore();
  const p = products.find((x) => x.id === productId);
  const [tab, setTab] = useState<"history" | "details" | "bills">("history");
  const [priceOpen, setPriceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  if (!p) return <Page><PageHeader title="Not found" back /><Empty title="This product doesn't exist" /></Page>;
  const v = vendors.find((x) => x.id === p.vendorId);
  const cat = categories.find((c) => c.id === p.categoryId);
  const isDM = v?.type === "DM";
  const c = currentPrice(p);
  const hist = sortedHistory(p);
  const bills = hist.filter((h) => h.bill);
  const st = stockState(p);
  const maxSp = Math.max(...hist.map((h) => h.sp), 1);

  return (
    <Page>
      <PageHeader title={p.name} subtitle={v?.name} back actions={<GhostButton className="h-11 w-11 px-0" aria-label="Edit product" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></GhostButton>} />

      <Tilt className="p-5" max={6}>
        <div className="flex items-center gap-5">
          <div className="perspective">
            <div className="animate-floaty grid h-24 w-24 place-items-center rounded-3xl bg-secondary text-6xl shadow-3d">{p.emoji}</div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-2xl font-bold">{p.name}</h2>
            {v && <Link to="/vendors/$vendorId" params={{ vendorId: v.id }} className="text-sm text-muted-foreground hover:text-primary">{v.name}</Link>}
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              {v && <span className="rounded-full bg-primary/15 px-3 py-1 text-primary">{v.type === "GST" ? "GST Billed" : v.type}</span>}
              {cat && <Link to="/categories/$categoryId" params={{ categoryId: cat.id }} className="rounded-full bg-accent/15 px-3 py-1 text-accent">{cat.name}</Link>}
            </div>
          </div>
        </div>
        <div className={cn("mt-5 grid gap-2", isDM ? "grid-cols-5" : "grid-cols-4")}>
          {[
            { l: "Cost ₹", el: <Chip kind="cost" value={c.cost} className="w-full text-sm" /> },
            { l: "GST", el: <Chip kind="gst" value={c.gst} pct className="w-full text-sm" /> },
            { l: "SP ₹", el: <Chip kind="sp" value={c.sp} className="w-full text-sm" /> },
            ...(isDM ? [{ l: "CP ₹", el: <Chip kind="cp" value={c.cp ?? c.cost} className="w-full text-sm" /> }] : []),
            { l: "Profit ₹", el: <Chip kind={profitOf(c) >= 0 ? "profit" : "loss"} value={profitOf(c)} className="w-full text-sm" /> },
          ].map((x) => (
            <div key={x.l} className="text-center">
              <div className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">{x.l}</div>
              {x.el}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sp/10 p-4 ring-1 ring-sp/25">
          <CalendarDays className="h-6 w-6 text-sp" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Current Price (updated)</div>
            <div className="font-display text-xl font-bold">{fmtDate(c.date)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Margin</div>
            <div className="font-display font-bold text-profit">{marginOf(c)}%</div>
          </div>
        </div>
      </Tilt>

      <div className="glass my-5 grid grid-cols-3 gap-1 rounded-2xl p-1">
        {([["history", "Price History"], ["details", "Product Details"], ["bills", "View Bills"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("h-11 rounded-xl text-xs font-bold transition sm:text-sm", tab === k ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {tab === "history" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Price History</h3>
            <PrimaryButton className="h-10 px-4" onClick={() => setPriceOpen(true)}><Plus className="h-4 w-4" /> Update Price</PrimaryButton>
          </div>
          {/* 3D bar chart */}
          <div className="glass perspective mb-4 flex h-36 items-end gap-2 overflow-x-auto rounded-3xl px-4 pb-3 pt-4">
            {[...hist].reverse().map((h) => (
              <div key={h.id} className="flex min-w-10 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-sp">{Math.round(h.sp)}</span>
                <div
                  className="w-full rounded-t-lg"
                  style={{
                    height: `${(h.sp / maxSp) * 80}px`,
                    background: "linear-gradient(to top, color-mix(in oklab, var(--sp) 40%, transparent), var(--sp))",
                    boxShadow: "5px -3px 0 -1px color-mix(in oklab, var(--sp) 45%, black)",
                    transform: "rotateX(8deg)",
                  }}
                />
                <span className="whitespace-nowrap text-[9px] text-muted-foreground">{h.date.slice(2, 7)}</span>
              </div>
            ))}
          </div>
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="min-w-[34rem] space-y-2">
              <div className="grid grid-cols-[6.5rem_repeat(4,1fr)_5rem_2rem] gap-2 px-3 text-[11px] font-bold uppercase text-muted-foreground">
                <span>Date</span><span>Cost ₹</span><span>GST</span><span>SP ₹</span><span>Profit ₹</span><span>Change</span><span />
              </div>
              {hist.map((h, i) => {
                const prev = hist[i + 1];
                const diff = prev ? h.cost - prev.cost : 0;
                return (
                  <div key={h.id} className={cn("glass grid grid-cols-[6.5rem_repeat(4,1fr)_5rem_2rem] items-center gap-2 rounded-2xl px-3 py-3 text-sm tabular-nums", i === 0 && "ring-2 ring-primary/60")}>
                    <span className="font-semibold">{fmtDate(h.date)}</span>
                    <span>{fmt(h.cost)}</span>
                    <span>{h.gst}%</span>
                    <span>{fmt(h.sp)}</span>
                    <span className="text-profit">{fmt(profitOf(h))}</span>
                    <span>
                      {i === 0 ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Current</span>
                      ) : null}
                      {i !== 0 && prev && (
                        <span className={cn("flex items-center gap-0.5 text-xs font-bold", diff > 0 ? "text-destructive" : diff < 0 ? "text-sp" : "text-muted-foreground")}>
                          {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {diff > 0 ? "+" : ""}{fmt(diff)}
                        </span>
                      )}
                      {i === 0 && prev && (
                        <span className={cn("ml-1 text-[10px] font-bold", diff > 0 ? "text-destructive" : "text-sp")}>{diff > 0 ? "+" : ""}{fmt(diff)}</span>
                      )}
                    </span>
                    <button
                      aria-label="Delete entry"
                      disabled={hist.length <= 1}
                      onClick={() => confirm("Delete this price entry?") && deletePrice(p.id, h.id)}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {tab === "details" && (
        <section className="space-y-3">
          <div className="glass grid grid-cols-2 gap-4 rounded-3xl p-5 text-sm">
            <Info l="Vendor" v={v?.name ?? "—"} />
            <Info l="Category" v={cat?.name ?? "Uncategorised"} />
            <Info l="Unit" v={p.unit} />
            <Info l="Low-stock alert" v={`${p.lowStockAt} ${p.unit}`} />
            <Info l="Price entries" v={String(hist.length)} />
            <Info l="First recorded" v={fmtDate(hist[hist.length - 1]?.date ?? "")} />
          </div>
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Stock</div>
                <div className={cn("font-display text-3xl font-bold", st === "out" ? "text-destructive" : st === "low" ? "text-cp" : "text-sp")}>{p.stock} <span className="text-base">{p.unit}</span></div>
              </div>
              <div className="flex gap-2">
                <GhostButton className="h-12 w-12 px-0" aria-label="Decrease stock" onClick={() => updateProduct(p.id, { stock: Math.max(0, p.stock - 1) })}><Minus className="h-5 w-5" /></GhostButton>
                <PrimaryButton className="h-12 w-12 px-0" aria-label="Increase stock" onClick={() => updateProduct(p.id, { stock: p.stock + 1 })}><Plus className="h-5 w-5" /></PrimaryButton>
              </div>
            </div>
          </div>
          <GhostButton
            className="w-full text-destructive"
            onClick={() => {
              if (confirm(`Delete ${p.name}?`)) {
                deleteProduct(p.id);
                toast.success("Product deleted");
                nav({ to: v ? "/vendors/$vendorId" : "/products", params: v ? { vendorId: v.id } : undefined } as never);
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete Product
          </GhostButton>
        </section>
      )}

      {tab === "bills" && (
        <section className="space-y-2">
          {bills.length === 0 ? (
            <Empty title="No bills recorded" hint="Add a bill number when you update the price." action={<PrimaryButton onClick={() => setPriceOpen(true)}>Update Price</PrimaryButton>} />
          ) : (
            bills.map((b) => (
              <div key={b.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xl">🧾</span>
                <div className="flex-1">
                  <div className="font-semibold">{b.bill}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(b.date)}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold">₹{fmt(b.cost)}</div>
                  <div className="text-xs text-muted-foreground">+{b.gst}% GST = ₹{fmt(b.cost * (1 + b.gst / 100))}</div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <PriceDialog open={priceOpen} onOpenChange={setPriceOpen} product={p} isDM={isDM} />
      <ProductDialog open={editOpen} onOpenChange={setEditOpen} product={p} />
    </Page>
  );
}

function Info({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{l}</div>
      <div className="font-semibold">{v}</div>
    </div>
  );
}
