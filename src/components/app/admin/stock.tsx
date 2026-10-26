import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, inputCls } from "../forms";
import { Empty, FilterPills, GhostButton, PrimaryButton, SearchBox } from "../ui3d";
import { cn } from "@/lib/utils";
import { fmtDate, stockState, today, useStore, type Product, type StockEntry } from "@/lib/store";
import { Pill, Row, Section, Stat, smallBtn } from "./parts";

function orderLink(storeName: string, vendorName: string, phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  const body = encodeURIComponent(`${text}\n— ${storeName}`);
  return digits.length === 10 ? `https://wa.me/91${digits}?text=${body}` : `https://wa.me/?text=${body}`;
}

function EntryDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill?: { productId: string; kind: "in" | "out" };
}) {
  const { products, addStockEntry } = useStore();
  const [pid, setPid] = useState("");
  const [kind, setKind] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setPid(prefill?.productId ?? products[0]?.id ?? "");
    setKind(prefill?.kind ?? "in");
    setQty("");
    setDate(today());
    setNote("");
  }, [open, prefill, products]);

  const save = () => {
    const n = Number(qty);
    if (!pid) {
      toast.error("Choose a product");
      return;
    }
    if (!qty || !Number.isFinite(n) || n <= 0) {
      toast.error("Enter a quantity");
      return;
    }
    addStockEntry(pid, { kind, qty: Math.floor(n), date: date || today(), note });
    toast.success(kind === "in" ? `Stock in: +${Math.floor(n)}` : `Stock out: −${Math.floor(n)}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="font-display">Stock entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Product" required>
            <select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-popover">
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What happened" required>
            <FilterPills
              value={kind}
              onChange={(v) => setKind(v)}
              options={[
                { value: "in", label: "Aaya (purchase)" },
                { value: "out", label: "Gaya (sold)" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" required>
              <input className={inputCls} type="number" min="1" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Date" required>
              <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Note">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bill no., customer…" />
          </Field>
          <PrimaryButton onClick={save} className="w-full">
            Save entry
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StockAdmin() {
  const { storeName, products, vendors, entries, deleteStockEntry } = useStore();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "in" | "out">("all");
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ productId: string; kind: "in" | "out" } | undefined>();

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return entries
      .filter((e) => byId.has(e.productId))
      .filter((e) => kind === "all" || e.kind === kind)
      .filter((e) => !t || (byId.get(e.productId)?.name.toLowerCase().includes(t) ?? false))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, byId, kind, q]);

  const need = useMemo(() => products.filter((p) => stockState(p) !== "in"), [products]);
  const soldToday = useMemo(() => {
    const d = today();
    return entries.filter((e) => e.kind === "out" && e.date === d).reduce((a, e) => a + e.qty, 0);
  }, [entries]);

  const start = (productId: string, k: "in" | "out") => {
    setPrefill({ productId, kind: k });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat l="Entries on file" v={entries.length} />
        <Stat l="Sold today" v={soldToday} c="text-sp" />
        <Stat l="Needs reorder" v={need.length} c={need.length ? "text-destructive" : "text-profit"} />
        <Stat l="Products tracked" v={products.length} />
      </div>

      <Section
        title="Reorder list"
        hint="Items at or below their low-stock limit. One tap sends the order to the vendor on WhatsApp."
        action={
          <PrimaryButton className="shrink-0 px-4" onClick={() => { setPrefill(undefined); setOpen(true); }}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Stock entry</span>
          </PrimaryButton>
        }
      >
        {need.length === 0 ? (
          <p className="text-sm text-profit">Nothing to reorder — every item is above its limit.</p>
        ) : (
          <div className="space-y-2">
            {need.map((p, i) => {
              const v = vendors.find((x) => x.id === p.vendorId);
              return (
                <Row key={p.id} delay={i}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-xl">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {v?.name ?? "No vendor"} · {p.stock} {p.unit} left · alert at {p.lowStockAt}
                    </div>
                  </div>
                  <Pill tone={stockState(p) === "out" ? "bad" : "warn"}>{stockState(p) === "out" ? "Out" : "Low"}</Pill>
                  <div className="flex shrink-0 items-center gap-1">
                    {v && (
                      <a
                        href={orderLink(storeName, v.name, v.phone, `Namaste ${v.name}, please send ${p.name} (only ${p.stock} ${p.unit} left).`)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Order ${p.name} from ${v.name}`}
                        className="glass hidden h-8 w-8 place-items-center rounded-lg sm:grid"
                      >
                        <Phone className="h-3.5 w-3.5 text-profit" />
                      </a>
                    )}
                    <button className={cn(smallBtn, "bg-primary text-primary-foreground")} onClick={() => start(p.id, "in")}>
                      + Stock
                    </button>
                  </div>
                </Row>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Stock ledger" hint="Every purchase and sale you recorded. Deleting an entry puts the quantity back.">
        <div className="mb-3 flex gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search product…" />
          <PrimaryButton className="shrink-0 px-4" onClick={() => { setPrefill(undefined); setOpen(true); }}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </PrimaryButton>
        </div>
        <div className="mb-3">
          <FilterPills
            value={kind}
            onChange={(v) => setKind(v)}
            options={[
              { value: "all", label: "All", count: entries.length },
              { value: "in", label: "Aaya" },
              { value: "out", label: "Gaya" },
            ]}
          />
        </div>
        {list.length === 0 ? (
          <Empty title="No entries yet" hint="Add a stock entry to start tracking what comes in and goes out." />
        ) : (
          <div className="space-y-2">
            {list.map((e, i) => (
              <EntryRow key={e.id} e={e} p={byId.get(e.productId)} delay={i} onDelete={() => deleteStockEntry(e.id)} />
            ))}
          </div>
        )}
      </Section>

      <EntryDialog open={open} onOpenChange={setOpen} {...(prefill ? { prefill } : {})} />
    </div>
  );
}

function EntryRow({ e, p, delay, onDelete }: { e: StockEntry; p: Product | undefined; delay: number; onDelete: () => void }) {
  return (
    <Row delay={delay}>
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          e.kind === "in" ? "bg-profit/12 text-profit" : "bg-sp/12 text-sp",
        )}
      >
        {e.kind === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{p?.name ?? "—"}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {fmtDate(e.date)}
          {e.note ? ` · ${e.note}` : ""}
        </div>
      </div>
      <span className={cn("shrink-0 font-display text-sm font-bold tabular-nums", e.kind === "in" ? "text-profit" : "text-sp")}>
        {e.kind === "in" ? "+" : "−"}
        {e.qty}
      </span>
      <button aria-label="Delete entry" onClick={() => confirm(`Remove this ${e.kind} entry of ${e.qty}?`) && onDelete()} className="glass grid h-8 w-8 shrink-0 place-items-center rounded-lg text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </Row>
  );
}
