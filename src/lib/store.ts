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
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Profit = selling price − purchase price (discounted CP when present, else cost). */
export function profitOf(e: Pick<PriceEntry, "cost" | "sp" | "cp">): number {
  const base = e.cp != null && !Number.isNaN(e.cp) && e.cp > 0 ? e.cp : e.cost;
  return Math.round((e.sp - base) * 100) / 100;
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
    date, gst: e.gst, cp: e.cp,
    cost: field === "sp" ? e.cost : ch(e.cost),
    sp: field === "cost" ? e.sp : ch(e.sp),
  };
}

// ---------- seed ----------
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
  id, name, type, status, phone, gstin: type === "GST" ? "23ABCDE1234F1Z5" : "", address: "", notes: "", createdAt: "2026-01-10",
});
const seedVendors: Vendor[] = [
  V("omshiv", "Om Shiv Marketing", "GST", "active", "98260 11223"),
  V("jaibheru", "Jai Bheru Bhavani", "GST"),
  V("sksweets", "SK Sweets", "GST"),
  V("britannia", "Britannia Distributor", "GST"),
  V("mondelez", "Mondelez India", "GST"),
  V("itc", "ITC Foods", "GST"),
  V("sharma", "Sharma Kirana", "URD"),
  V("ramesh", "Ramesh Stores", "URD"),
  V("aggarwal", "Aggarwal Market", "URD"),
  V("mehta", "Mehta Mart", "URD", "inactive"),
  V("dmself", "DM Purchases", "DM"),
];

const P = (
  id: string, vendorId: string, categoryId: string, name: string, emoji: string,
  hist: [string, number, number, number, number?][], stock = 24,
): Product => ({
  id, vendorId, categoryId, name, emoji, unit: "pcs", stock, lowStockAt: 5,
  history: hist.map(([date, cost, gst, sp, cp]) => ({ id: uid(), date, cost, gst, sp, cp })),
});
const seedProducts: Product[] = [
  P("nutella", "omshiv", "chocolates", "Nutella Spread", "🫙", [
    ["2026-10-25", 180, 5, 200], ["2026-09-10", 170, 5, 195], ["2026-07-15", 160, 5, 190], ["2026-05-02", 150, 5, 185], ["2026-01-18", 145, 5, 180], ["2025-11-05", 140, 5, 175],
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

interface StoreState {
  storeName: string;
  categories: Category[];
  vendors: Vendor[];
  products: Product[];
  setStoreName: (n: string) => void;
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
  importData: (d: { storeName?: string; categories: Category[]; vendors: Vendor[]; products: Product[] }) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      storeName: "Rj Store",
      categories: seedCategories,
      vendors: seedVendors,
      products: seedProducts,
      setStoreName: (storeName) => set({ storeName }),
      addCategory: (c) => {
        const cat = { ...c, id: uid() };
        set((s) => ({ categories: [...s.categories, cat] }));
        return cat;
      },
      updateCategory: (id, c) => set((s) => ({ categories: s.categories.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((x) => x.id !== id),
          products: s.products.map((p) => (p.categoryId === id ? { ...p, categoryId: "" } : p)),
        })),
      addVendor: (v) => {
        const ven = { ...v, id: uid(), createdAt: today() };
        set((s) => ({ vendors: [...s.vendors, ven] }));
        return ven;
      },
      updateVendor: (id, v) => set((s) => ({ vendors: s.vendors.map((x) => (x.id === id ? { ...x, ...v } : x)) })),
      deleteVendor: (id) =>
        set((s) => ({ vendors: s.vendors.filter((x) => x.id !== id), products: s.products.filter((p) => p.vendorId !== id) })),
      addProduct: (p) => {
        const prod = { ...p, id: uid() };
        set((s) => ({ products: [...s.products, prod] }));
        return prod;
      },
      updateProduct: (id, p) => set((s) => ({ products: s.products.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),
      addPrice: (productId, e) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === productId ? { ...p, history: [...p.history, { ...e, id: uid() }] } : p)),
        })),
      deletePrice: (productId, entryId) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId && p.history.length > 1 ? { ...p, history: p.history.filter((h) => h.id !== entryId) } : p,
          ),
        })),
      importData: (d) =>
        set({ storeName: d.storeName ?? "Rj Store", categories: d.categories, vendors: d.vendors, products: d.products }),
      resetDemo: () => set({ storeName: "Rj Store", categories: seedCategories, vendors: seedVendors, products: seedProducts }),
      clearAll: () => set({ categories: [], vendors: [], products: [] }),
    }),
    { name: "rj-store-v1" },
  ),
);

export const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
export const fmtDate = (d: string) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
export const hueOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
