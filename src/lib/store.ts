import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VendorType = "GST" | "URD" | "DM";
export type Status = "active" | "inactive";

export interface Category {
  id: string;
  name: string;
  icon: string;
  hue: number;
}

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  status: Status;
  phone: string;
  gstin: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface PriceEntry {
  id: string;
  date: string; // yyyy-mm-dd
  cost: number;
  gst: number;
  sp: number;
  cp?: number | undefined; // discounted purchase price (DM)
  bill?: string | undefined;
}

export interface Product {
  id: string;
  vendorId: string;
  categoryId: string;
  name: string;
  emoji: string;
  unit: string;
  stock: number;
  lowStockAt: number;
  history: PriceEntry[];
  photo?: string | undefined; // data URL
}

/** Stock movement: "in" = purchase/got, "out" = sold/given out. */
export interface StockEntry {
  id: string;
  productId: string;
  kind: "in" | "out";
  qty: number;
  date: string;
  note?: string | undefined;
  billId?: string | undefined;
  // price snapshot taken when the entry was recorded (used for date-wise profit)
  cost?: number | undefined;
  sp?: number | undefined;
  cp?: number | undefined;
}

/** Vendor purchase bill. paid < amount means bakaya (dues). */
export interface Bill {
  id: string;
  vendorId: string;
  date: string;
  invoiceNo: string;
  amount: number;
  paid: number;
  gst: number;
  note?: string | undefined;
}

export type ActivityKind = "add" | "edit" | "delete" | "price" | "stock" | "bill" | "settings" | "import" | "restore";

export interface Activity {
  id: string;
  at: string; // ISO timestamp
  kind: ActivityKind;
  text: string;
  trashId?: string | undefined;
}

export type TrashKind = "product" | "vendor" | "category" | "bill";
export interface TrashItem {
  id: string;
  kind: TrashKind;
  at: string;
  label: string;
  data: unknown;
}

export interface Settings {
  defaultGst: number;
  lowStockAt: number;
  profitBase: "cp" | "cost"; // profit = SP - (CP when present, else cost) | SP - cost always
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Profit = selling price − purchase price. base="cp" uses the discounted CP when present, else cost. */
export function profitRaw(e: Pick<PriceEntry, "cost" | "sp" | "cp">, base: Settings["profitBase"] = "cp"): number {
  const useCp = base === "cp" && e.cp != null && !Number.isNaN(e.cp) && e.cp > 0;
  const b = useCp ? e.cp! : e.cost;
  return Math.round((e.sp - b) * 100) / 100;
}

/** Profit honouring the store's own profit formula setting. */
export function profitOf(e: Pick<PriceEntry, "cost" | "sp" | "cp">): number {
  return profitRaw(e, useStore.getState().settings?.profitBase ?? "cp");
}

export function marginOf(e: Pick<PriceEntry, "cost" | "sp" | "cp">): number {
  if (!e.sp) return 0;
  return Math.round((profitOf(e) / e.sp) * 1000) / 10;
}

export function sortedHistory(p: Product): PriceEntry[] {
  return [...p.history].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function currentPrice(p: Product): PriceEntry {
  return sortedHistory(p)[0] ?? { id: "x", date: "", cost: 0, gst: 0, sp: 0 };
}

export function stockState(p: Product): "in" | "low" | "out" {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.lowStockAt) return "low";
  return "in";
}

export const today = () => new Date().toISOString().slice(0, 10);

export type BulkMode = "pct" | "amt";
export type BulkField = "cost" | "sp" | "both";
/** New price entry after a bulk change: % or ₹ added (negative = decrease), never below 0, rounded to paise. */
export function applyBulkPrice(e: PriceEntry, field: BulkField, mode: BulkMode, value: number, date: string): Omit<PriceEntry, "id"> {
  const ch = (n: number) => Math.max(0, Math.round((mode === "pct" ? n * (1 + value / 100) : n + value) * 100) / 100);
  return {
    date,
    gst: e.gst,
    cp: e.cp,
    cost: field === "sp" ? e.cost : ch(e.cost),
    sp: field === "cost" ? e.sp : ch(e.sp),
  };
}

/* ---------------- bills ---------------- */
export const billDue = (b: Bill) => Math.max(0, Math.round((b.amount - b.paid) * 100) / 100);
export const billStatus = (b: Bill): "paid" | "partial" | "unpaid" =>
  billDue(b) <= 0 ? "paid" : b.paid <= 0 ? "unpaid" : "partial";
/** Bill amount is tax-inclusive: taxable + tax = amount. */
export function gstSplit(amount: number, gst: number): { taxable: number; tax: number } {
  const taxable = Math.round((amount / (1 + gst / 100)) * 100) / 100;
  return { taxable, tax: Math.round((amount - taxable) * 100) / 100 };
}

/* ---------------- stock ledger ---------------- */
export function ledgerOf(entries: StockEntry[], productId: string): { in: number; out: number } {
  let inn = 0;
  let out = 0;
  for (const e of entries)
    if (e.productId === productId) {
      if (e.kind === "in") inn += e.qty;
      else out += e.qty;
    }
  return { in: inn, out };
}

/** Profit of a movement: uses the price snapshot when present, else the product's current price. */
export function entryProfit(e: StockEntry, p: Product | undefined): number {
  if (!p) return 0;
  if (e.sp != null && e.cost != null) return profitRaw({ cost: e.cost, sp: e.sp, cp: e.cp });
  return profitOf(currentPrice(p));
}

export type RangeKey = "today" | "week" | "month" | "all";
export function rangeFrom(k: RangeKey): string {
  const d = new Date();
  if (k === "week") d.setDate(d.getDate() - 6);
  if (k === "month") d.setDate(1);
  if (k === "all") return "0000-01-01";
  return d.toISOString().slice(0, 10);
}

export interface RangeReport {
  sales: number;
  salesValue: number;
  profit: number;
  purchases: number;
  entries: number;
}
export function rangeSummary(products: Product[], entries: StockEntry[], from: string): RangeReport {
  const byId = new Map(products.map((p) => [p.id, p]));
  const r: RangeReport = { sales: 0, salesValue: 0, profit: 0, purchases: 0, entries: 0 };
  for (const e of entries) {
    if (e.date < from) continue;
    const p = byId.get(e.productId);
    if (!p) continue;
    r.entries++;
    if (e.kind === "out") {
      r.sales += e.qty;
      r.salesValue += e.qty * (e.sp ?? currentPrice(p).sp);
      r.profit += entryProfit(e, p) * e.qty;
    } else r.purchases += e.qty;
  }
  r.salesValue = Math.round(r.salesValue * 100) / 100;
  r.profit = Math.round(r.profit * 100) / 100;
  return r;
}

/* ---------------- price change feed ---------------- */
export interface PriceChange {
  product: Product;
  entry: PriceEntry;
  prev?: PriceEntry | undefined;
  costDelta: number;
  spDelta: number;
  marginDelta: number;
}
export function priceFeed(products: Product[], limit = 60): PriceChange[] {
  const out: PriceChange[] = [];
  for (const p of products) {
    const h = sortedHistory(p);
    for (let i = 0; i < h.length; i++) {
      const entry = h[i]!;
      const prev = h[i + 1];
      out.push({
        product: p,
        entry,
        prev,
        costDelta: prev ? Math.round((entry.cost - prev.cost) * 100) / 100 : 0,
        spDelta: prev ? Math.round((entry.sp - prev.sp) * 100) / 100 : 0,
        marginDelta: prev ? Math.round((marginOf(entry) - marginOf(prev)) * 10) / 10 : 0,
      });
    }
  }
  return out.sort((a, b) => (a.entry.date < b.entry.date ? 1 : a.entry.date > b.entry.date ? -1 : 0)).slice(0, limit);
}

/* ---------------- data check ---------------- */
export interface DataCheck {
  noVendor: Product[];
  noCategory: Product[];
  noPrice: Product[];
  loss: Product[];
  low: Product[];
  dupes: { key: string; items: Product[] }[];
  total: number;
}
export function dataCheck(products: Product[], vendors: Vendor[], categories: Category[]): DataCheck {
  const vIds = new Set(vendors.map((v) => v.id));
  const cIds = new Set(categories.map((c) => c.id));
  const groups = new Map<string, Product[]>();
  products.forEach((p) => {
    const k = `${p.name.trim().toLowerCase()}|${p.vendorId}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  });
  const dupes = [...groups.entries()].filter(([, items]) => items.length > 1).map(([key, items]) => ({ key, items }));
  const noVendor = products.filter((p) => !vIds.has(p.vendorId));
  const noCategory = products.filter((p) => !cIds.has(p.categoryId));
  const noPrice = products.filter((p) => !p.history.length);
  const loss = products.filter((p) => profitOf(currentPrice(p)) < 0);
  const low = products.filter((p) => stockState(p) !== "in");
  return {
    noVendor,
    noCategory,
    noPrice,
    loss,
    low,
    dupes,
    total: noVendor.length + noCategory.length + noPrice.length + loss.length + low.length + dupes.reduce((a, d) => a + d.items.length, 0),
  };
}

/* ---------------- GST report ---------------- */
export interface GstRow {
  type: VendorType;
  n: number;
  total: number;
  tax: number;
  due: number;
}
export function gstReport(bills: Bill[], vendors: Vendor[]): GstRow[] {
  const order: VendorType[] = ["GST", "URD", "DM"];
  const map: Record<VendorType, GstRow> = {
    GST: { type: "GST", n: 0, total: 0, tax: 0, due: 0 },
    URD: { type: "URD", n: 0, total: 0, tax: 0, due: 0 },
    DM: { type: "DM", n: 0, total: 0, tax: 0, due: 0 },
  };
  for (const b of bills) {
    const t = map[vendors.find((v) => v.id === b.vendorId)?.type ?? "GST"]!;
    t.n++;
    t.total += b.amount;
    t.tax += gstSplit(b.amount, b.gst).tax;
    t.due += billDue(b);
  }
  return order.map((k) => map[k]!);
}

/** Stock value + profit grouped by the GST rate on each product's current price. */
export function gstBuckets(products: Product[]): { gst: number; n: number; value: number }[] {
  const m = new Map<number, { gst: number; n: number; value: number }>();
  for (const p of products) {
    const c = currentPrice(p);
    const cur = m.get(c.gst) ?? { gst: c.gst, n: 0, value: 0 };
    cur.n++;
    cur.value += c.cost * Math.max(0, p.stock);
    m.set(c.gst, cur);
  }
  return [...m.values()].sort((a, b) => a.gst - b.gst);
}

/* ---------------- seed ---------------- */
const C = (id: string, name: string, icon: string, hue: number): Category => ({ id, name, icon, hue });
const seedCategories: Category[] = [
  C("bakery", "Bakery", "🥐", 70),
  C("snacks", "Snacks", "🍟", 25),
  C("chocolates", "Chocolates", "🍫", 300),
  C("juices", "Juices", "🧃", 145),
  C("biscuits", "Biscuits", "🍪", 240),
  C("beverages", "Beverages", "🥤", 15),
  C("noodles", "Noodles & Pasta", "🍜", 160),
  C("sweets", "Sweets", "🍬", 330),
  C("dryfruits", "Dry Fruits & Seeds", "🥜", 190),
];

const V = (id: string, name: string, type: VendorType, status: Status = "active", phone = ""): Vendor => ({
  id,
  name,
  type,
  status,
  phone,
  gstin: type === "GST" ? "23ABCDE1234F1Z5" : "",
  address: "",
  notes: "",
  createdAt: "2026-01-10",
});
const seedVendors: Vendor[] = [
  V("omshiv", "Om Shiv Marketing", "GST", "active", "98260 11223"),
  V("jaibheru", "Jai Bheru Bhavani", "GST", "active", "98261 44556"),
  V("sksweets", "SK Sweets", "GST", "active", "99770 22114"),
  V("britannia", "Britannia Distributor", "GST", "active", "98262 77889"),
  V("mondelez", "Mondelez India", "GST"),
  V("itc", "ITC Foods", "GST", "active", "98265 10020"),
  V("sharma", "Sharma Kirana", "URD", "active", "98930 55443"),
  V("ramesh", "Ramesh Stores", "URD"),
  V("aggarwal", "Aggarwal Market", "URD"),
  V("mehta", "Mehta Mart", "URD", "inactive"),
  V("dmself", "DM Purchases", "DM"),
];

const P = (
  id: string,
  vendorId: string,
  categoryId: string,
  name: string,
  emoji: string,
  hist: [string, number, number, number, number?][],
  stock = 24,
): Product => ({
  id,
  vendorId,
  categoryId,
  name,
  emoji,
  unit: "pcs",
  stock,
  lowStockAt: 5,
  history: hist.map(([date, cost, gst, sp, cp], i) => ({ id: `h-${id}-${i + 1}`, date, cost, gst, sp, cp })),
});
const seedProducts: Product[] = [
  P("nutella", "omshiv", "chocolates", "Nutella Spread", "🫙", [
    ["2026-10-25", 180, 5, 200],
    ["2026-09-10", 170, 5, 195],
    ["2026-07-15", 160, 5, 190],
    ["2026-05-02", 150, 5, 185],
    ["2026-01-18", 145, 5, 180],
    ["2025-11-05", 140, 5, 175],
  ]),
  P("kinder", "omshiv", "chocolates", "Kinder Joy", "🥚", [["2026-10-20", 35, 5, 70]], 40),
  P("dairymilk", "omshiv", "chocolates", "Cadbury Dairy Milk", "🍫", [["2026-10-01", 50, 5, 80]], 3),
  P("oreo", "omshiv", "biscuits", "Oreo Biscuits", "🍪", [["2026-10-01", 30, 5, 55]]),
  P("pringles", "omshiv", "snacks", "Pringles Original", "🥫", [["2026-09-28", 60, 5, 100]]),
  P("lays", "omshiv", "snacks", "Lays Classic", "🍟", [["2026-09-28", 20, 5, 40]], 0),
  P("maggi", "omshiv", "noodles", "Maggi Noodles", "🍜", [["2026-09-20", 24, 5, 45]]),
  P("centerfresh", "omshiv", "sweets", "Center Fresh Gum", "🍬", [["2026-09-20", 25, 12, 50]]),
  P("bread", "britannia", "bakery", "White Bread 400g", "🍞", [["2026-10-22", 28, 0, 40]]),
  P("croissant", "britannia", "bakery", "Croissant", "🥐", [["2026-10-22", 18, 5, 30]]),
  P("rusk", "britannia", "bakery", "Rusk 200g", "🥖", [["2026-10-22", 25, 5, 45]]),
  P("frooti", "itc", "juices", "Mango Juice 1L", "🧃", [["2026-10-12", 60, 12, 99]]),
  P("kaju", "sharma", "dryfruits", "Kaju 250g", "🥜", [["2026-10-05", 210, 0, 280]]),
  P("ladoo", "sksweets", "sweets", "Besan Ladoo 500g", "🟠", [["2026-10-18", 140, 5, 220]]),
  P("dm-dairymilk", "dmself", "chocolates", "Cadbury Dairy Milk", "🍫", [["2026-10-15", 50, 5, 80, 70]]),
  P("dm-lays", "dmself", "snacks", "Lays Classic", "🍟", [["2026-10-15", 20, 5, 40, 35]], 4),
  P("dm-fanta", "dmself", "beverages", "Fanta Orange", "🥤", [["2026-10-15", 22, 12, 45, 40]]),
  P("dm-parle", "dmself", "biscuits", "Parle-G", "🍘", [["2026-10-15", 18, 5, 35, 32]], 0),
];

const SE = (id: string, productId: string, kind: "in" | "out", qty: number, date: string, note: string): StockEntry => ({
  id,
  productId,
  kind,
  qty,
  date,
  note,
});
const seedEntries: StockEntry[] = [
  SE("s-1", "nutella", "in", 24, "2026-10-25", "Om Shiv invoice 1042"),
  SE("s-2", "nutella", "out", 6, "2026-10-26", "Counter sales"),
  SE("s-3", "kinder", "out", 10, "2026-10-26", "Counter sales"),
  SE("s-4", "dairymilk", "in", 10, "2026-10-24", "Om Shiv invoice 1042"),
  SE("s-5", "dairymilk", "out", 7, "2026-10-25", "Counter sales"),
  SE("s-6", "oreo", "in", 20, "2026-10-23", "Om Shiv invoice 1035"),
  SE("s-7", "oreo", "out", 4, "2026-10-26", "Counter sales"),
  SE("s-8", "lays", "out", 12, "2026-10-21", "Counter sales"),
  SE("s-9", "maggi", "in", 30, "2026-10-20", "Om Shiv invoice 1028"),
  SE("s-10", "maggi", "out", 5, "2026-10-25", "Counter sales"),
  SE("s-11", "bread", "in", 20, "2026-10-26", "Britannia bill BR-77"),
  SE("s-12", "bread", "out", 8, "2026-10-26", "Counter sales"),
  SE("s-13", "croissant", "out", 3, "2026-10-25", "Counter sales"),
  SE("s-14", "frooti", "out", 6, "2026-10-24", "Counter sales"),
  SE("s-15", "kaju", "out", 1, "2026-10-23", "Counter sales"),
  SE("s-16", "ladoo", "out", 4, "2026-10-22", "Counter sales"),
  SE("s-17", "rusk", "in", 15, "2026-10-22", "Britannia bill BR-77"),
  SE("s-18", "dm-lays", "out", 2, "2026-10-26", "Counter sales"),
];

const B = (id: string, vendorId: string, date: string, invoiceNo: string, amount: number, paid: number, gst: number): Bill => ({
  id,
  vendorId,
  date,
  invoiceNo,
  amount,
  paid,
  gst,
});
const seedBills: Bill[] = [
  B("b-1", "omshiv", "2026-10-24", "INV-1042", 12500, 10000, 5),
  B("b-2", "omshiv", "2026-10-26", "INV-1051", 8400, 0, 5),
  B("b-3", "britannia", "2026-10-25", "BR-77", 4200, 4200, 5),
  B("b-4", "sksweets", "2026-10-20", "SKS-31", 5600, 5600, 5),
  B("b-5", "sharma", "2026-10-22", "SK-9", 3100, 1500, 0),
  B("b-6", "dmself", "2026-10-15", "DM-5", 2200, 2200, 12),
];

const seedSettings: Settings = { defaultGst: 5, lowStockAt: 5, profitBase: "cp" };

/* ---------------- store ---------------- */
interface StoreState {
  storeName: string;
  settings: Settings;
  categories: Category[];
  vendors: Vendor[];
  products: Product[];
  entries: StockEntry[];
  bills: Bill[];
  activity: Activity[];
  trash: TrashItem[];
  setStoreName: (n: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  addCategory: (c: Omit<Category, "id">) => Category;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addVendor: (v: Omit<Vendor, "id" | "createdAt">) => Vendor;
  updateVendor: (id: string, v: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addPrice: (productId: string, e: Omit<PriceEntry, "id">) => void;
  deletePrice: (productId: string, entryId: string) => void;
  addStockEntry: (productId: string, e: { kind: "in" | "out"; qty: number; date: string; note?: string; billId?: string }) => void;
  deleteStockEntry: (entryId: string) => void;
  addBill: (b: Omit<Bill, "id">) => Bill;
  updateBill: (id: string, b: Partial<Bill>) => void;
  payBill: (id: string, amount: number) => void;
  deleteBill: (id: string) => void;
  importProducts: (rows: Omit<Product, "id">[]) => number;
  undoTrash: (trashId: string) => void;
  clearTrash: () => void;
  importData: (d: {
    storeName?: string;
    settings?: Partial<Settings>;
    categories: Category[];
    vendors: Vendor[];
    products: Product[];
    entries?: StockEntry[];
    bills?: Bill[];
  }) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => {
      const log = (kind: ActivityKind, text: string, trashId?: string) =>
        set((s) => ({
          activity: [{ id: uid(), at: new Date().toISOString(), kind, text, trashId }, ...s.activity].slice(0, 200),
        }));
      const pushTrash = (kind: TrashKind, label: string, data: unknown) => {
        const t: TrashItem = { id: uid(), kind, at: new Date().toISOString(), label, data };
        set((s) => ({ trash: [t, ...s.trash].slice(0, 40) }));
        return t.id;
      };

      return {
        storeName: "Rj Store",
        settings: seedSettings,
        categories: seedCategories,
        vendors: seedVendors,
        products: seedProducts,
        entries: seedEntries,
        bills: seedBills,
        activity: [],
        trash: [],

        setStoreName: (storeName) => {
          set({ storeName });
          log("settings", `Store name set to ${storeName}`);
        },
        setSettings: (patch) => {
          set((s) => ({ settings: { ...s.settings, ...patch } }));
          log("settings", `Settings updated: ${Object.keys(patch).join(", ")}`);
        },

        addCategory: (c) => {
          const cat = { ...c, id: uid() };
          set((s) => ({ categories: [...s.categories, cat] }));
          log("add", `Category added: ${cat.name}`);
          return cat;
        },
        updateCategory: (id, c) => {
          set((s) => ({ categories: s.categories.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
          log("edit", `Category updated: ${c.name ?? id}`);
        },
        deleteCategory: (id) =>
          set((s) => {
            const cat = s.categories.find((x) => x.id === id);
            const tid = cat ? pushTrash("category", cat.name, cat) : undefined;
            if (cat) log("delete", `Category deleted: ${cat.name}`, tid);
            return {
              categories: s.categories.filter((x) => x.id !== id),
              products: s.products.map((p) => (p.categoryId === id ? { ...p, categoryId: "" } : p)),
            };
          }),

        addVendor: (v) => {
          const ven = { ...v, id: uid(), createdAt: today() };
          set((s) => ({ vendors: [...s.vendors, ven] }));
          log("add", `Vendor added: ${ven.name} (${ven.type})`);
          return ven;
        },
        updateVendor: (id, v) => {
          set((s) => ({ vendors: s.vendors.map((x) => (x.id === id ? { ...x, ...v } : x)) }));
          log("edit", `Vendor updated: ${v.name ?? id}`);
        },
        deleteVendor: (id) =>
          set((s) => {
            const v = s.vendors.find((x) => x.id === id);
            const items = s.products.filter((p) => p.vendorId === id);
            const tid = v ? pushTrash("vendor", `${v.name} (+${items.length} products)`, { vendor: v, products: items }) : undefined;
            if (v) log("delete", `Vendor deleted: ${v.name} and ${items.length} products`, tid);
            return { vendors: s.vendors.filter((x) => x.id !== id), products: s.products.filter((p) => p.vendorId !== id) };
          }),

        addProduct: (p) => {
          const prod = { ...p, id: uid() };
          set((s) => ({ products: [...s.products, prod] }));
          log("add", `Product added: ${prod.name}`);
          return prod;
        },
        updateProduct: (id, p) => {
          set((s) => ({ products: s.products.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
          log("edit", `Product updated: ${p.name ?? id}`);
        },
        deleteProduct: (id) =>
          set((s) => {
            const p = s.products.find((x) => x.id === id);
            const tid = p ? pushTrash("product", p.name, p) : undefined;
            if (p) log("delete", `Product deleted: ${p.name}`, tid);
            return { products: s.products.filter((x) => x.id !== id) };
          }),

        addPrice: (productId, e) => {
          set((s) => ({
            products: s.products.map((p) => (p.id === productId ? { ...p, history: [...p.history, { ...e, id: uid() }] } : p)),
          }));
          const p = useStore.getState().products.find((x) => x.id === productId);
          log("price", `New price for ${p?.name ?? productId}: cost ₹${e.cost}, SP ₹${e.sp} (${e.date})`);
        },
        deletePrice: (productId, entryId) =>
          set((s) => ({
            products: s.products.map((p) =>
              p.id === productId && p.history.length > 1 ? { ...p, history: p.history.filter((h) => h.id !== entryId) } : p,
            ),
          })),

        addStockEntry: (productId, e) => {
          const qty = Math.max(0, Math.floor(e.qty));
          if (!qty) return;
          set((s) => {
            const p = s.products.find((x) => x.id === productId);
            if (!p) return {};
            const cur = currentPrice(p);
            const entry: StockEntry = {
              id: uid(),
              productId,
              kind: e.kind,
              qty,
              date: e.date,
              note: e.note?.trim() || undefined,
              billId: e.billId,
              cost: cur.cost,
              sp: cur.sp,
              cp: cur.cp,
            };
            return {
              entries: [entry, ...s.entries],
              products: s.products.map((x) =>
                x.id === productId
                  ? { ...x, stock: e.kind === "in" ? x.stock + qty : Math.max(0, x.stock - qty) }
                  : x,
              ),
            };
          });
          const p = useStore.getState().products.find((x) => x.id === productId);
          log("stock", `${e.kind === "in" ? "Stock in" : "Stock out"}: ${p?.name ?? productId} ${e.kind === "in" ? "+" : "−"}${qty}`);
        },
        deleteStockEntry: (entryId) =>
          set((s) => {
            const e = s.entries.find((x) => x.id === entryId);
            if (!e) return {};
            log("delete", `Stock entry removed: ${e.kind} ${e.qty} (${e.date})`);
            return {
              entries: s.entries.filter((x) => x.id !== entryId),
              products: s.products.map((p) =>
                p.id === e.productId
                  ? { ...p, stock: e.kind === "in" ? Math.max(0, p.stock - e.qty) : p.stock + e.qty }
                  : p,
              ),
            };
          }),

        addBill: (b) => {
          const bill = { ...b, id: uid() };
          set((s) => ({ bills: [bill, ...s.bills] }));
          log("bill", `Bill added: ${bill.invoiceNo} ₹${fmt(bill.amount)}${billDue(bill) ? ` (due ₹${fmt(billDue(bill))})` : ""}`);
          return bill;
        },
        updateBill: (id, b) => {
          set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, ...b } : x)) }));
          log("edit", `Bill updated: ${b.invoiceNo ?? id}`);
        },
        payBill: (id, amount) => {
          const amt = Math.max(0, amount);
          set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, paid: Math.min(b.amount, Math.round((b.paid + amt) * 100) / 100) } : b)) }));
          log("bill", `Payment ₹${fmt(amt)} recorded on bill ${id}`);
        },
        deleteBill: (id) =>
          set((s) => {
            const b = s.bills.find((x) => x.id === id);
            const tid = b ? pushTrash("bill", `${b.invoiceNo} ₹${fmt(b.amount)}`, b) : undefined;
            if (b) log("delete", `Bill deleted: ${b.invoiceNo}`, tid);
            return { bills: s.bills.filter((x) => x.id !== id) };
          }),

        importProducts: (rows) => {
          if (!rows.length) return 0;
          set((s) => ({ products: [...s.products, ...rows.map((r) => ({ ...r, id: uid() }))] }));
          log("import", `Imported ${rows.length} products from file`);
          return rows.length;
        },

        undoTrash: (trashId) =>
          set((s) => {
            const t = s.trash.find((x) => x.id === trashId);
            if (!t) return {};
            log("restore", `Restored ${t.kind}: ${t.label}`);
            if (t.kind === "product") return { products: [...s.products, t.data as Product], trash: s.trash.filter((x) => x.id !== trashId) };
            if (t.kind === "category")
              return { categories: [...s.categories, t.data as Category], trash: s.trash.filter((x) => x.id !== trashId) };
            if (t.kind === "bill") return { bills: [...s.bills, t.data as Bill], trash: s.trash.filter((x) => x.id !== trashId) };
            const d = t.data as { vendor: Vendor; products: Product[] };
            return {
              vendors: [...s.vendors, d.vendor],
              products: [...s.products, ...d.products],
              trash: s.trash.filter((x) => x.id !== trashId),
            };
          }),
        clearTrash: () => {
          set({ trash: [] });
          log("delete", "Trash cleared");
        },

        importData: (d) => {
          set({
            storeName: d.storeName ?? "Rj Store",
            settings: { ...seedSettings, ...d.settings },
            categories: d.categories,
            vendors: d.vendors,
            products: d.products,
            entries: d.entries ?? [],
            bills: d.bills ?? [],
          });
          log("import", `Backup restored: ${d.products.length} products, ${d.vendors.length} vendors`);
        },
        resetDemo: () => {
          set({
            storeName: "Rj Store",
            settings: seedSettings,
            categories: seedCategories,
            vendors: seedVendors,
            products: seedProducts,
            entries: seedEntries,
            bills: seedBills,
            trash: [],
          });
          log("settings", "Store reset to sample data");
        },
        clearAll: () => {
          set({ categories: [], vendors: [], products: [], entries: [], bills: [], trash: [] });
          log("delete", "All data deleted");
        },
      };
    },
    { name: "rj-store-v1" },
  ),
);

export const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
export const fmtDate = (d: string) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
export const hueOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
