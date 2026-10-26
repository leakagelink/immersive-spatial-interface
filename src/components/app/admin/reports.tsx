import { useMemo, useState } from "react";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  billDue,
  currentPrice,
  dataCheck,
  fmt,
  fmtDate,
  gstBuckets,
  gstReport,
  marginOf,
  priceFeed,
  profitOf,
  rangeFrom,
  rangeSummary,
  stockState,
  useStore,
  type RangeKey,
} from "@/lib/store";
import { Bar, Section, Stat } from "./parts";

const RANGES: { v: RangeKey; l: string }[] = [
  { v: "today", l: "Today" },
  { v: "week", l: "Last 7 days" },
  { v: "month", l: "This month" },
  { v: "all", l: "All time" },
];

function Issue({ title, names, tone = "warn" }: { title: string; names: string[]; tone?: "warn" | "bad" }) {
  if (!names.length) return null;
  return (
    <details className="glass rounded-2xl p-3">
      <summary className={cn("flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold", tone === "bad" ? "text-destructive" : "text-cp")}>
        <span className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {title}
        </span>
        <span className="shrink-0 tabular-nums">{names.length}</span>
      </summary>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {names.slice(0, 30).map((n) => (
          <li key={n} className="truncate">
            • {n}
          </li>
        ))}
        {names.length > 30 && <li>…and {names.length - 30} more</li>}
      </ul>
    </details>
  );
}

export function Reports() {
  const { products, vendors, categories, bills, entries } = useStore();
  const [range, setRange] = useState<RangeKey>("week");
  const from = rangeFrom(range);

  const rr = useMemo(() => rangeSummary(products, entries, from), [products, entries, from]);
  const g = useMemo(() => gstReport(bills, vendors), [bills, vendors]);
  const buckets = useMemo(() => gstBuckets(products), [products]);
  const due = useMemo(() => bills.reduce((a, b) => a + billDue(b), 0), [bills]);
  const feed = useMemo(() => priceFeed(products, 10), [products]);
  const dc = useMemo(() => dataCheck(products, vendors, categories), [products, vendors, categories]);

  const s = useMemo(() => {
    const stockValue = products.reduce((a, p) => a + currentPrice(p).cost * Math.max(0, p.stock), 0);
    const potProfit = products.reduce((a, p) => a + profitOf(currentPrice(p)) * Math.max(0, p.stock), 0);
    const avgMargin = products.length ? products.reduce((a, p) => a + marginOf(currentPrice(p)), 0) / products.length : 0;
    const byVendor = vendors
      .map((v) => {
        const ps = products.filter((p) => p.vendorId === v.id);
        return { v, n: ps.length, profit: ps.reduce((a, p) => a + profitOf(currentPrice(p)) * Math.max(0, p.stock), 0) };
      })
      .filter((x) => x.n)
      .sort((a, b) => b.profit - a.profit);
    const byCat = categories
      .map((c) => ({ c, n: products.filter((p) => p.categoryId === c.id).length }))
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n);
    const top = [...products].sort((a, b) => profitOf(currentPrice(b)) - profitOf(currentPrice(a))).slice(0, 5);
    const st = { in: 0, low: 0, out: 0 };
    products.forEach((p) => {
      st[stockState(p)]++;
    });
    return { stockValue, potProfit, avgMargin, byVendor, byCat, top, st };
  }, [products, vendors, categories]);

  const maxV = Math.max(...s.byVendor.map((x) => x.profit), 0);
  const maxC = Math.max(...s.byCat.map((x) => x.n), 0);
  const maxT = Math.max(...s.top.map((p) => profitOf(currentPrice(p))), 0);

  return (
    <div className="space-y-5">
      <Section title="Date-wise business" hint="Only the stock entries (aaya / gaya) from the chosen period are counted.">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {RANGES.map((r) => (
            <button
              key={r.v}
              onClick={() => setRange(r.v)}
              className={cn("shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition", range === r.v ? "bg-primary text-primary-foreground" : "glass text-muted-foreground")}
            >
              {r.l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat l="Units sold" v={rr.sales} c="text-sp" />
          <Stat l="Sales value" v={`₹${fmt(rr.salesValue)}`} />
          <Stat l="Profit earned" v={`₹${fmt(rr.profit)}`} c="text-profit" />
          <Stat l="Units purchased in" v={rr.purchases} />
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat l="Stock value (cost)" v={`₹${fmt(s.stockValue)}`} />
        <Stat l="Profit if all stock sells" v={`₹${fmt(s.potProfit)}`} c="text-profit" />
        <Stat l="Average margin" v={`${s.avgMargin.toFixed(1)}%`} />
        <Stat l="Bakaya (vendor dues)" v={`₹${fmt(due)}`} c={due ? "text-destructive" : undefined} hint={`${bills.length} bills on file`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="GST report" hint="Bill totals, tax inside them and dues, by vendor type.">
          <div className="space-y-2 text-sm">
            {g.map((r) => (
              <div key={r.type} className="glass grid grid-cols-4 items-center gap-2 rounded-2xl p-3 tabular-nums">
                <span className="font-bold">{r.type}</span>
                <span className="text-right text-xs text-muted-foreground">{r.n} bills</span>
                <span className="text-right">₹{fmt(r.total)}</span>
                <span className={cn("text-right font-semibold", r.due ? "text-destructive" : "text-profit")}>{r.due ? `due ₹${fmt(r.due)}` : "clear"}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Input tax in bills: <span className="font-semibold text-foreground">₹{fmt(g.reduce((a, r) => a + r.tax, 0))}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {buckets.map((b) => (
              <span key={b.gst} className="glass rounded-full px-3 py-1">
                {b.gst}% · {b.n} items · ₹{fmt(b.value)}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Stock status" hint="How the whole shop stands right now.">
          <Bar label="In stock" value={s.st.in} max={products.length} right={String(s.st.in)} hue={150} />
          <Bar label="Low stock" value={s.st.low} max={products.length} right={String(s.st.low)} hue={70} />
          <Bar label="Out of stock" value={s.st.out} max={products.length} right={String(s.st.out)} hue={25} />
          <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
            <span className="glass rounded-full px-3 py-1">GST: {g[0]!.n ? "" : ""}</span>
          </div>
        </Section>

        <Section title="Price changes" hint="Latest price entries across the shop and what they moved.">
          {feed.length === 0 && <p className="text-sm text-muted-foreground">No price entries yet.</p>}
          {feed.map((f, i) => (
            <div key={`${f.entry.id}-${i}`} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold">
                  {f.product.emoji} {f.product.name}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDate(f.entry.date)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] tabular-nums text-muted-foreground">
                <span>Cost ₹{fmt(f.entry.cost)}</span>
                <span>SP ₹{fmt(f.entry.sp)}</span>
                <span className="text-profit">Profit ₹{fmt(profitOf(f.entry))}</span>
                {f.prev && (
                  <>
                    <span className={cn(f.costDelta > 0 ? "text-destructive" : f.costDelta < 0 ? "text-profit" : "")}>
                      cost {f.costDelta > 0 ? "+" : ""}
                      {fmt(f.costDelta)}
                    </span>
                    <span className={cn(f.spDelta > 0 ? "text-profit" : f.spDelta < 0 ? "text-destructive" : "")}>
                      SP {f.spDelta > 0 ? "+" : ""}
                      {fmt(f.spDelta)}
                    </span>
                    {f.marginDelta < 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <TrendingDown className="h-3 w-3" /> margin {f.marginDelta}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Data check" hint="Things that need your attention before they cost money.">
          <Issue title="Selling below cost" tone="bad" names={dc.loss.map((p) => `${p.name} — profit ₹${fmt(profitOf(currentPrice(p)))}`)} />
          <Issue title="No vendor set" names={dc.noVendor.map((p) => p.name)} />
          <Issue title="No category set" names={dc.noCategory.map((p) => p.name)} />
          <Issue title="No price entered" names={dc.noPrice.map((p) => p.name)} />
          <Issue title="Low or out of stock" names={dc.low.map((p) => `${p.name} — ${p.stock} left`)} />
          <Issue title="Same name + vendor twice" names={dc.dupes.map((d) => d.items.map((p) => p.name).join(" / "))} />
          {dc.total === 0 && <p className="text-sm text-profit">Everything looks clean — nothing to fix.</p>}
        </Section>

        <Section title="Top 5 profit per piece">
          {s.top.map((p) => (
            <Bar key={p.id} label={`${p.emoji} ${p.name}`} value={profitOf(currentPrice(p))} max={maxT} right={`₹${fmt(profitOf(currentPrice(p)))}`} hue={128} />
          ))}
        </Section>

        <Section title="Vendor-wise profit (on stock)">
          {s.byVendor.map((x) => (
            <Bar key={x.v.id} label={`${x.v.name} · ${x.n} items`} value={x.profit} max={maxV} right={`₹${fmt(x.profit)}`} hue={245} />
          ))}
        </Section>

        <Section title="Products per category">
          {s.byCat.map((x) => (
            <Bar key={x.c.id} label={`${x.c.icon} ${x.c.name}`} value={x.n} max={maxC} right={String(x.n)} hue={x.c.hue} />
          ))}
        </Section>
      </div>
    </div>
  );
}
