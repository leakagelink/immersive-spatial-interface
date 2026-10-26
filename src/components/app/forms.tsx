import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fmt, profitOf, today, useStore,
  type PriceEntry, type Product, type Vendor, type VendorType,
} from "@/lib/store";
import { PrimaryButton } from "./ui3d";
import { FileText, Store, Tag } from "lucide-react";

export const inputCls =
  "glass h-12 w-full rounded-2xl px-4 text-sm outline-none transition focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

export function Field({ label, required, children, hint, className }: { label: string; required?: boolean; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const GST_RATES = [0, 5, 12, 18, 28];
export const EMOJIS = ["📦", "🍫", "🍪", "🍟", "🥐", "🍞", "🧃", "🥤", "🍜", "🍬", "🥜", "🫙", "🥚", "🧈", "🧀", "🍚", "🌶️", "🧂", "☕", "🍯", "🥫", "🍦", "🧴", "🧼"];

export function VendorTypePicker({ value, onChange }: { value: VendorType; onChange: (v: VendorType) => void }) {
  const opts: { v: VendorType; label: string; icon: ReactNode; hue: number }[] = [
    { v: "GST", label: "GST Billed", icon: <FileText className="h-4 w-4" />, hue: 150 },
    { v: "URD", label: "URD", icon: <Store className="h-4 w-4" />, hue: 250 },
    { v: "DM", label: "DM", icon: <Tag className="h-4 w-4" />, hue: 65 },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => (
        <button
          type="button"
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn("flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold ring-2 transition", value === o.v ? "" : "glass ring-transparent text-muted-foreground")}
          style={value === o.v ? { background: `oklch(0.75 0.15 ${o.hue} / .15)`, color: `oklch(0.85 0.15 ${o.hue})`, boxShadow: `0 0 0 2px oklch(0.75 0.15 ${o.hue})` } : undefined}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

export interface PriceDraft { cost: string; gst: string; sp: string; cp: string; date: string; bill: string }
export const emptyPrice = (): PriceDraft => ({ cost: "", gst: "5", sp: "", cp: "", date: today(), bill: "" });

export function PriceFields({ d, set, showCp }: { d: PriceDraft; set: (d: PriceDraft) => void; showCp?: boolean | undefined }) {
  const p = profitOf({ cost: +d.cost || 0, sp: +d.sp || 0, cp: d.cp ? +d.cp : undefined });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Cost Price (₹)" required>
        <input className={inputCls} inputMode="decimal" type="number" step="0.01" min="0" value={d.cost} onChange={(e) => set({ ...d, cost: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="GST (%)" required>
        <select className={inputCls} value={d.gst} onChange={(e) => set({ ...d, gst: e.target.value })}>
          {GST_RATES.map((g) => <option key={g} value={g} className="bg-popover">{g}%</option>)}
        </select>
      </Field>
      <Field label="Selling Price / SP (₹)" required>
        <input className={inputCls} inputMode="decimal" type="number" step="0.01" min="0" value={d.sp} onChange={(e) => set({ ...d, sp: e.target.value })} placeholder="0.00" />
      </Field>
      {showCp ? (
        <Field label="Discounted CP (₹)" hint="Optional — used for profit">
          <input className={inputCls} inputMode="decimal" type="number" step="0.01" min="0" value={d.cp} onChange={(e) => set({ ...d, cp: e.target.value })} placeholder="0.00" />
        </Field>
      ) : (
        <Field label="Profit (₹)">
          <div className={cn("flex h-12 items-center rounded-2xl px-4 font-display text-lg font-bold ring-1", p >= 0 ? "bg-profit/12 text-profit ring-profit/30" : "bg-destructive/12 text-destructive ring-destructive/30")}>
            ₹ {fmt(p)}
          </div>
        </Field>
      )}
      {showCp && (
        <div className="col-span-2 flex items-center justify-between rounded-2xl bg-profit/10 px-4 py-3 ring-1 ring-profit/25">
          <span className="text-sm font-semibold text-muted-foreground">Profit</span>
          <span className={cn("font-display text-lg font-bold", p >= 0 ? "text-profit" : "text-destructive")}>₹ {fmt(p)}</span>
        </div>
      )}
      <Field label="Price Date" required>
        <input className={inputCls} type="date" value={d.date} onChange={(e) => set({ ...d, date: e.target.value })} />
      </Field>
      <Field label="Bill / Notes">
        <input className={inputCls} value={d.bill} onChange={(e) => set({ ...d, bill: e.target.value })} placeholder="Bill no. or notes" />
      </Field>
    </div>
  );
}

export function validatePrice(d: PriceDraft): Omit<PriceEntry, "id"> | null {
  const cost = parseFloat(d.cost), sp = parseFloat(d.sp), gst = parseFloat(d.gst);
  if (!(cost >= 0) || d.cost === "") { toast.error("Enter a valid cost price"); return null; }
  if (!(sp >= 0) || d.sp === "") { toast.error("Enter a valid selling price"); return null; }
  if (!d.date) { toast.error("Pick a price date"); return null; }
  const cp = d.cp ? parseFloat(d.cp) : undefined;
  return { cost, sp, gst: gst || 0, cp: cp && cp > 0 ? cp : undefined, date: d.date, bill: d.bill.trim() || undefined };
}

// ---------------- Product dialog ----------------
export function ProductDialog({ open, onOpenChange, vendorId, product }: { open: boolean; onOpenChange: (o: boolean) => void; vendorId?: string | undefined; product?: Product }) {
  const { vendors, categories, addProduct, updateProduct } = useStore();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [cat, setCat] = useState("");
  const [ven, setVen] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [stock, setStock] = useState("10");
  const [low, setLow] = useState("5");
  const [price, setPrice] = useState<PriceDraft>(emptyPrice());

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setEmoji(product?.emoji ?? "📦");
    setCat(product?.categoryId ?? categories[0]?.id ?? "");
    setVen(product?.vendorId ?? vendorId ?? vendors[0]?.id ?? "");
    setUnit(product?.unit ?? "pcs");
    setStock(String(product?.stock ?? 10));
    setLow(String(product?.lowStockAt ?? 5));
    setPrice(emptyPrice());
  }, [open, product, vendorId, categories, vendors]);

  const vType = vendors.find((v) => v.id === ven)?.type;

  const save = () => {
    if (!name.trim()) { toast.error("Product name is required"); return; }
    if (!ven) { toast.error("Choose a vendor"); return; }
    const base = { name: name.trim(), emoji, categoryId: cat, vendorId: ven, unit, stock: Math.max(0, +stock || 0), lowStockAt: Math.max(0, +low || 0) };
    if (product) {
      updateProduct(product.id, base);
      toast.success("Product updated");
    } else {
      const pe = validatePrice(price);
      if (!pe) return;
      addProduct({ ...base, history: [{ ...pe, id: Math.random().toString(36).slice(2) }] });
      toast.success(`${base.name} added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Product Name" required>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nutella Spread" autoFocus />
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button type="button" key={e} onClick={() => setEmoji(e)} className={cn("grid h-10 w-10 place-items-center rounded-xl text-xl transition", emoji === e ? "bg-primary/20 ring-2 ring-primary" : "glass")}>
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor" required>
              <select className={inputCls} value={ven} onChange={(e) => setVen(e.target.value)}>
                {vendors.map((v) => <option key={v.id} value={v.id} className="bg-popover">{v.name} ({v.type})</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="" className="bg-popover">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id} className="bg-popover">{c.icon} {c.name}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {["pcs", "pack", "box", "kg", "g", "L", "ml", "dozen"].map((u) => <option key={u} className="bg-popover">{u}</option>)}
              </select>
            </Field>
            <Field label="Stock">
              <input className={inputCls} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label="Low-stock alert at" className="col-span-2">
              <input className={inputCls} type="number" min="0" value={low} onChange={(e) => setLow(e.target.value)} />
            </Field>
          </div>
          {!product && <PriceFields d={price} set={setPrice} showCp={vType === "DM"} />}
          <PrimaryButton onClick={save} className="w-full">{product ? "Save Changes" : "Add Product"}</PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Price dialog ----------------
export function PriceDialog({ open, onOpenChange, product, isDM }: { open: boolean; onOpenChange: (o: boolean) => void; product: Product; isDM?: boolean }) {
  const addPrice = useStore((s) => s.addPrice);
  const [d, setD] = useState<PriceDraft>(emptyPrice());
  useEffect(() => {
    if (!open) return;
    const cur = [...product.history].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    setD({ cost: cur ? String(cur.cost) : "", gst: cur ? String(cur.gst) : "5", sp: cur ? String(cur.sp) : "", cp: cur?.cp ? String(cur.cp) : "", date: today(), bill: "" });
  }, [open, product]);
  const save = () => {
    const pe = validatePrice(d);
    if (!pe) return;
    addPrice(product.id, pe);
    toast.success("Price updated");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Update Price · {product.name}</DialogTitle>
        </DialogHeader>
        <PriceFields d={d} set={setD} showCp={isDM} />
        <PrimaryButton onClick={save} className="w-full">Save New Price</PrimaryButton>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Vendor dialog ----------------
export function VendorDialog({ open, onOpenChange, vendor, defaultType = "GST", onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; vendor?: Vendor; defaultType?: VendorType; onSaved?: (v: Vendor) => void }) {
  const { addVendor, updateVendor } = useStore();
  const [f, setF] = useState({ name: "", type: defaultType as VendorType, status: "active" as Vendor["status"], phone: "", gstin: "", address: "", notes: "" });
  useEffect(() => {
    if (!open) return;
    setF(vendor ? { name: vendor.name, type: vendor.type, status: vendor.status, phone: vendor.phone, gstin: vendor.gstin, address: vendor.address, notes: vendor.notes } : { name: "", type: defaultType, status: "active", phone: "", gstin: "", address: "", notes: "" });
  }, [open, vendor, defaultType]);
  const save = () => {
    if (!f.name.trim()) { toast.error("Vendor name is required"); return; }
    if (vendor) {
      updateVendor(vendor.id, { ...f, name: f.name.trim() });
      toast.success("Vendor updated");
      onSaved?.({ ...vendor, ...f });
    } else {
      const v = addVendor({ ...f, name: f.name.trim() });
      toast.success(`${v.name} added`);
      onSaved?.(v);
    }
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        <VendorFields f={f} setF={setF} />
        <PrimaryButton onClick={save} className="w-full">{vendor ? "Save Changes" : "Add Vendor"}</PrimaryButton>
      </DialogContent>
    </Dialog>
  );
}

type VF = { name: string; type: VendorType; status: Vendor["status"]; phone: string; gstin: string; address: string; notes: string };
export function VendorFields({ f, setF }: { f: VF; setF: (f: VF) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Vendor Name" required>
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Om Shiv Marketing" />
      </Field>
      <Field label="Vendor Type" required>
        <VendorTypePicker value={f.type} onChange={(type) => setF({ ...f, type })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input className={inputCls} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98XXX XXXXX" />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as VF["status"] })}>
            <option value="active" className="bg-popover">Active</option>
            <option value="inactive" className="bg-popover">Inactive</option>
          </select>
        </Field>
      </div>
      {f.type === "GST" && (
        <Field label="GSTIN">
          <input className={cn(inputCls, "uppercase")} value={f.gstin} maxLength={15} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} placeholder="15-digit GSTIN" />
        </Field>
      )}
      <Field label="Address">
        <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Shop / market address" />
      </Field>
      <Field label="Notes">
        <textarea className={cn(inputCls, "h-20 py-3")} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Payment terms, delivery days…" />
      </Field>
    </div>
  );
}
