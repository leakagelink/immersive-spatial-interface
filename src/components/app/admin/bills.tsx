import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, GST_RATES, inputCls } from "../forms";
import { Empty, FilterPills, GhostButton, PrimaryButton, SearchBox } from "../ui3d";
import { cn } from "@/lib/utils";
import { billDue, billStatus, fmt, fmtDate, gstSplit, today, useStore, type Bill, type VendorType } from "@/lib/store";
import { Pill, Row, Section, Stat, smallBtn, useSelection } from "./parts";

const tone = { paid: "good", partial: "warn", unpaid: "bad" } as const;

function BillDialog({ open, onOpenChange, bill }: { open: boolean; onOpenChange: (o: boolean) => void; bill?: Bill }) {
  const { vendors, addBill, updateBill } = useStore();
  const [f, setF] = useState({ vendorId: "", date: today(), invoiceNo: "", amount: "", paid: "", gst: "5", note: "" });

  useEffect(() => {
    if (!open) return;
    setF(
      bill
        ? { vendorId: bill.vendorId, date: bill.date, invoiceNo: bill.invoiceNo, amount: String(bill.amount), paid: String(bill.paid), gst: String(bill.gst), note: bill.note ?? "" }
        : { vendorId: vendors[0]?.id ?? "", date: today(), invoiceNo: "", amount: "", paid: "", gst: "5", note: "" },
    );
  }, [open, bill, vendors]);

  const save = () => {
    const amount = parseFloat(f.amount);
    const paid = f.paid === "" ? 0 : parseFloat(f.paid);
    if (!f.vendorId) {
      toast.error("Choose a vendor");
      return;
    }
    if (!f.invoiceNo.trim()) {
      toast.error("Enter the bill / invoice number");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a bill amount");
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      toast.error("Enter a paid amount");
      return;
    }
    const body = {
      vendorId: f.vendorId,
      date: f.date || today(),
      invoiceNo: f.invoiceNo.trim(),
      amount: Math.round(amount * 100) / 100,
      paid: Math.round(Math.min(paid, amount) * 100) / 100,
      gst: parseFloat(f.gst) || 0,
      note: f.note.trim() || undefined,
    };
    if (bill) {
      updateBill(bill.id, body);
      toast.success("Bill updated");
    } else {
      addBill(body);
      toast.success("Bill added");
    }
    onOpenChange(false);
  };

  const due = Math.max(0, (parseFloat(f.amount) || 0) - (f.paid === "" ? 0 : parseFloat(f.paid) || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="font-display">{bill ? "Edit Bill" : "Add Bill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor" required>
              <select className={inputCls} value={f.vendorId} onChange={(e) => setF({ ...f, vendorId: e.target.value })}>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id} className="bg-popover">
                    {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date" required>
              <input className={inputCls} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
            <Field label="Bill / invoice no." required>
              <input className={inputCls} value={f.invoiceNo} onChange={(e) => setF({ ...f, invoiceNo: e.target.value })} placeholder="INV-1042" />
            </Field>
            <Field label="GST on bill">
              <select className={inputCls} value={f.gst} onChange={(e) => setF({ ...f, gst: e.target.value })}>
                {GST_RATES.map((g) => (
                  <option key={g} value={g} className="bg-popover">
                    {g}%
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bill amount (₹)" required>
              <input className={inputCls} type="number" inputMode="decimal" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0.00" />
            </Field>
            <Field label="Paid (₹)">
              <input className={inputCls} type="number" inputMode="decimal" min="0" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} placeholder="0.00" />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-3 ring-1 ring-border">
            <span className="text-sm font-semibold text-muted-foreground">Bakaya left</span>
            <span className={cn("font-display text-lg font-bold tabular-nums", due ? "text-destructive" : "text-profit")}>₹ {fmt(due)}</span>
          </div>
          <Field label="Note">
            <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Items, terms…" />
          </Field>
          <PrimaryButton onClick={save} className="w-full">
            {bill ? "Save Changes" : "Add Bill"}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ bill, onOpenChange }: { bill: Bill | undefined; onOpenChange: (o: boolean) => void }) {
  const { vendors, payBill } = useStore();
  const [v, setV] = useState("");
  useEffect(() => {
    if (bill) setV(String(billDue(bill)));
  }, [bill]);
  const vnd = vendors.find((x) => x.id === bill?.vendorId);
  return (
    <Dialog open={!!bill} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="font-display">Payment on {bill?.invoiceNo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {vnd?.name} · bill ₹{fmt(bill?.amount ?? 0)} · paid ₹{fmt(bill?.paid ?? 0)} · due ₹{fmt(bill ? billDue(bill) : 0)}
        </p>
        <Field label="Amount paid now (₹)" required>
          <input className={inputCls} type="number" inputMode="decimal" min="0" value={v} onChange={(e) => setV(e.target.value)} />
        </Field>
        <PrimaryButton
          className="w-full"
          onClick={() => {
            const n = parseFloat(v);
            if (!Number.isFinite(n) || n <= 0) {
              toast.error("Enter an amount");
              return;
            }
            payBill(bill!.id, n);
            toast.success(`₹${fmt(n)} paid`);
            onOpenChange(false);
          }}
        >
          Record payment
        </PrimaryButton>
      </DialogContent>
    </Dialog>
  );
}

export function BillsAdmin() {
  const { bills, vendors, deleteBill, updateBill } = useStore();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [type, setType] = useState<"all" | VendorType>("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Bill | undefined>();
  const [pay, setPay] = useState<Bill | undefined>();
  const { sel, toggle, setAll, clear } = useSelection();

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return bills
      .filter((b) => st === "all" || billStatus(b) === st)
      .filter((b) => type === "all" || vendors.find((v) => v.id === b.vendorId)?.type === type)
      .filter((b) => !t || b.invoiceNo.toLowerCase().includes(t) || (vendors.find((v) => v.id === b.vendorId)?.name.toLowerCase().includes(t) ?? false))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [bills, vendors, q, st, type]);

  const tot = useMemo(
    () => ({
      amount: bills.reduce((a, b) => a + b.amount, 0),
      paid: bills.reduce((a, b) => a + b.paid, 0),
      due: bills.reduce((a, b) => a + billDue(b), 0),
      tax: bills.reduce((a, b) => a + gstSplit(b.amount, b.gst).tax, 0),
    }),
    [bills],
  );

  const ids = [...sel];
  const allOn = list.length > 0 && list.every((b) => sel.has(b.id));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat l="Total billed" v={`₹${fmt(tot.amount)}`} hint={`${bills.length} bills`} />
        <Stat l="Paid" v={`₹${fmt(tot.paid)}`} c="text-profit" />
        <Stat l="Bakaya" v={`₹${fmt(tot.due)}`} c={tot.due ? "text-destructive" : "text-profit"} />
        <Stat l="Tax inside bills" v={`₹${fmt(tot.tax)}`} />
      </div>

      <Section title="Bills & payments" hint="Add a bill, record a payment, and see what is still owed to each vendor.">
        <div className="mb-3 flex gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search invoice or vendor…" />
          <PrimaryButton
            className="shrink-0 px-4"
            onClick={() => {
              setEdit(undefined);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Bill</span>
          </PrimaryButton>
        </div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <FilterPills
              value={st}
              onChange={(v) => setSt(v)}
              options={[
                { value: "all", label: "All", count: bills.length },
                { value: "unpaid", label: "Unpaid" },
                { value: "partial", label: "Partial" },
                { value: "paid", label: "Paid" },
              ]}
            />
          </div>
          <FilterPills
            value={type}
            onChange={(v) => setType(v)}
            options={[
              { value: "all", label: "All types" },
              { value: "GST", label: "GST" },
              { value: "URD", label: "URD" },
              { value: "DM", label: "DM" },
            ]}
          />
        </div>

        <BulkBar count={sel.size} onClear={clear}>
          <button
            className={cn(smallBtn, "bg-primary text-primary-foreground")}
            onClick={() => {
              ids.forEach((id) => {
                const b = bills.find((x) => x.id === id);
                if (b) updateBill(id, { paid: b.amount });
              });
              clear();
              toast.success("Marked fully paid");
            }}
          >
            Mark paid
          </button>
          <button
            className={cn(smallBtn, "bg-destructive text-destructive-foreground")}
            onClick={() => {
              if (!confirm(`Delete ${ids.length} bills?`)) return;
              ids.forEach(deleteBill);
              clear();
              toast.success("Bills deleted");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </BulkBar>

        <div className="mb-2 flex items-center gap-3 px-3 text-xs font-bold uppercase text-muted-foreground">
          <button
            onClick={() => (allOn ? clear() : setAll(list.map((b) => b.id)))}
            className="grid h-6 w-6 place-items-center rounded-lg text-xs font-black ring-1 ring-border"
            aria-label="Select all"
          >
            {allOn ? "✓" : ""}
          </button>
          <span>Select all ({list.length})</span>
        </div>

        {list.length === 0 ? (
          <Empty title="No bills yet" hint="Add your first vendor bill to start tracking dues." />
        ) : (
          <div className="space-y-2">
            {list.map((b, i) => {
              const v = vendors.find((x) => x.id === b.vendorId);
              const s = billStatus(b);
              return (
                <Row key={b.id} on={sel.has(b.id)} delay={i}>
                  <button
                    onClick={() => toggle(b.id)}
                    aria-label="Select"
                    className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black ring-1", sel.has(b.id) ? "bg-primary text-primary-foreground ring-primary" : "ring-border")}
                  >
                    {sel.has(b.id) ? "✓" : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {b.invoiceNo} <span className="font-normal text-muted-foreground">· {v?.name ?? "—"}</span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground tabular-nums">
                      {fmtDate(b.date)} · bill ₹{fmt(b.amount)} · paid ₹{fmt(b.paid)} · GST {b.gst}%
                    </div>
                  </div>
                  <Pill tone={tone[s]}>{s === "paid" ? "Paid" : s === "partial" ? `Due ₹${fmt(billDue(b))}` : `Due ₹${fmt(billDue(b))}`}</Pill>
                  <div className="flex shrink-0 items-center gap-1">
                    {s !== "paid" && (
                      <button className={cn(smallBtn, "bg-primary text-primary-foreground")} onClick={() => setPay(b)}>
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Pay</span>
                      </button>
                    )}
                    <button
                      aria-label="Edit bill"
                      onClick={() => {
                        setEdit(b);
                        setOpen(true);
                      }}
                      className="glass grid h-8 w-8 place-items-center rounded-lg"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Delete bill"
                      onClick={() => confirm(`Delete bill ${b.invoiceNo}?`) && (deleteBill(b.id), toast.success("Bill deleted"))}
                      className="glass grid h-8 w-8 place-items-center rounded-lg text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Row>
              );
            })}
          </div>
        )}
      </Section>

      <BillDialog key={edit?.id ?? "new"} open={open} onOpenChange={setOpen} {...(edit ? { bill: edit } : {})} />
      <PayDialog bill={pay} onOpenChange={(o) => !o && setPay(undefined)} />
    </div>
  );
}

function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
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
