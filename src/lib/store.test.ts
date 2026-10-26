import { describe, expect, it } from "vitest";
import {
  applyBulkPrice,
  billDue,
  billStatus,
  csvToProductsCheck,
  dataCheck,
  entryProfit,
  gstReport,
  gstSplit,
  ledgerOf,
  priceFeed,
  profitRaw,
  rangeSummary,
  type Bill,
  type Category,
  type PriceEntry,
  type Product,
  type StockEntry,
  type Vendor,
} from "./store";

const entry = (over: Partial<PriceEntry> = {}): PriceEntry => ({ id: "e", date: "2026-10-25", cost: 100, gst: 5, sp: 150, ...over });

describe("profit", () => {
  it("uses the discounted CP when the formula allows it", () => {
    expect(profitRaw({ cost: 50, sp: 80, cp: 70 })).toBe(10);
  });
  it("uses cost when the formula is cost-only", () => {
    expect(profitRaw({ cost: 50, sp: 80, cp: 70 }, "cost")).toBe(30);
  });
  it("ignores a missing or zero CP", () => {
    expect(profitRaw({ cost: 50, sp: 80 })).toBe(30);
    expect(profitRaw({ cost: 50, sp: 80, cp: 0 })).toBe(30);
  });
});

describe("applyBulkPrice", () => {
  it("adds 10% to cost and SP", () => {
    expect(applyBulkPrice(entry({ cost: 100, sp: 150 }), "both", "pct", 10, "2026-10-26")).toMatchObject({ cost: 110, sp: 165 });
  });
  it("adds a flat amount to SP only", () => {
    expect(applyBulkPrice(entry({ cost: 100, sp: 150 }), "sp", "amt", 5, "2026-10-26")).toMatchObject({ cost: 100, sp: 155 });
  });
  it("never drops a price below zero", () => {
    expect(applyBulkPrice(entry({ cost: 3, sp: 5 }), "both", "amt", -10, "2026-10-26")).toMatchObject({ cost: 0, sp: 0 });
  });
});

describe("bills", () => {
  const bill = (over: Partial<Bill> = {}): Bill => ({
    id: "b",
    vendorId: "v",
    date: "2026-10-24",
    invoiceNo: "INV-1",
    amount: 1000,
    paid: 0,
    gst: 5,
    ...over,
  });
  it("tracks the bakaya left on a bill", () => {
    expect(billDue(bill({ paid: 400 }))).toBe(600);
    expect(billDue(bill({ paid: 1200 }))).toBe(0);
  });
  it("labels a bill paid, partial or unpaid", () => {
    expect(billStatus(bill({ paid: 1000 }))).toBe("paid");
    expect(billStatus(bill({ paid: 300 }))).toBe("partial");
    expect(billStatus(bill())).toBe("unpaid");
  });
  it("splits a tax-inclusive bill into taxable and tax", () => {
    expect(gstSplit(1050, 5)).toEqual({ taxable: 1000, tax: 50 });
    expect(gstSplit(1000, 0)).toEqual({ taxable: 1000, tax: 0 });
  });
});

describe("stock ledger", () => {
  const e = (over: Partial<StockEntry>): StockEntry => ({ id: "x", productId: "p1", kind: "in", qty: 1, date: "2026-10-20", ...over });
  const entries = [e({ id: "1", kind: "in", qty: 20 }), e({ id: "2", kind: "out", qty: 6 }), e({ id: "3", kind: "out", qty: 4 }), e({ id: "4", productId: "p2", kind: "in", qty: 9 })];
  it("sums what came in and what went out per product", () => {
    expect(ledgerOf(entries, "p1")).toEqual({ in: 20, out: 10 });
    expect(ledgerOf(entries, "p2")).toEqual({ in: 9, out: 0 });
  });
  it("uses the price snapshot of a sale when it has one", () => {
    const p: Product = {
      id: "p1",
      vendorId: "v",
      categoryId: "c",
      name: "X",
      emoji: "📦",
      unit: "pcs",
      stock: 5,
      lowStockAt: 2,
      history: [{ id: "h", date: "2026-10-25", cost: 100, gst: 5, sp: 150 }],
    };
    expect(entryProfit(e({ kind: "out", qty: 2, sp: 150, cost: 120 }), p)).toBe(30);
    expect(entryProfit(e({ kind: "out", qty: 2 }), p)).toBe(50);
  });
});

describe("date-wise report", () => {
  const p: Product = {
    id: "p1",
    vendorId: "v",
    categoryId: "c",
    name: "X",
    emoji: "📦",
    unit: "pcs",
    stock: 5,
    lowStockAt: 2,
    history: [{ id: "h", date: "2026-10-25", cost: 100, gst: 5, sp: 150 }],
  };
  const entries: StockEntry[] = [
    { id: "1", productId: "p1", kind: "out", qty: 3, date: "2026-10-26", cost: 100, sp: 150 },
    { id: "2", productId: "p1", kind: "out", qty: 2, date: "2026-10-10", cost: 100, sp: 150 },
    { id: "3", productId: "p1", kind: "in", qty: 10, date: "2026-10-26" },
  ];
  it("counts only the sales from the chosen date onwards", () => {
    const r = rangeSummary([p], entries, "2026-10-26");
    expect(r).toEqual({ sales: 3, salesValue: 450, profit: 150, purchases: 10, entries: 2 });
  });
  it("includes older sales when the range is wide open", () => {
    expect(rangeSummary([p], entries, "0000-01-01").sales).toBe(5);
  });
});

describe("price change feed", () => {
  const p: Product = {
    id: "p1",
    vendorId: "v",
    categoryId: "c",
    name: "Nutella",
    emoji: "🫙",
    unit: "pcs",
    stock: 5,
    lowStockAt: 2,
    history: [
      { id: "h1", date: "2026-10-25", cost: 180, gst: 5, sp: 200 },
      { id: "h2", date: "2026-09-10", cost: 170, gst: 5, sp: 195 },
    ],
  };
  it("shows the newest price first and what moved", () => {
    const feed = priceFeed([p]);
    expect(feed[0]!.entry.date).toBe("2026-10-25");
    expect(feed[0]!.costDelta).toBe(10);
    expect(feed[0]!.spDelta).toBe(5);
    expect(feed[1]!.prev).toBeUndefined();
  });
});

describe("data check", () => {
  const vendors: Vendor[] = [{ id: "v1", name: "Om", type: "GST", status: "active", phone: "", gstin: "", address: "", notes: "", createdAt: "2026-01-01" }];
  const categories: Category[] = [{ id: "c1", name: "Snacks", icon: "🍟", hue: 20 }];
  const p = (over: Partial<Product>): Product => ({
    id: "x",
    vendorId: "v1",
    categoryId: "c1",
    name: "Lays",
    emoji: "🍟",
    unit: "pcs",
    stock: 10,
    lowStockAt: 5,
    history: [{ id: "h", date: "2026-10-25", cost: 20, gst: 5, sp: 40 }],
    ...over,
  });
  it("flags missing vendor, selling below cost, and duplicate names", () => {
    const r = dataCheck([p({ id: "a" }), p({ id: "b", name: "lays" }), p({ id: "c", vendorId: "gone" }), p({ id: "d", history: [{ id: "h", date: "2026-10-25", cost: 50, gst: 5, sp: 40 }] })], vendors, categories);
    expect(r.noVendor.map((x) => x.id)).toEqual(["c"]);
    expect(r.loss.map((x) => x.id)).toEqual(["d"]);
    expect(r.dupes[0]!.items.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("GST report", () => {
  const vendors: Vendor[] = [
    { id: "v1", name: "Om", type: "GST", status: "active", phone: "", gstin: "", address: "", notes: "", createdAt: "2026-01-01" },
    { id: "v2", name: "Sharma", type: "URD", status: "active", phone: "", gstin: "", address: "", notes: "", createdAt: "2026-01-01" },
  ];
  const bills: Bill[] = [
    { id: "b1", vendorId: "v1", date: "2026-10-24", invoiceNo: "1", amount: 1050, paid: 500, gst: 5 },
    { id: "b2", vendorId: "v2", date: "2026-10-22", invoiceNo: "2", amount: 1000, paid: 0, gst: 0 },
  ];
  it("splits bill totals, tax and dues by vendor type", () => {
    const r = gstReport(bills, vendors);
    expect(r[0]).toEqual({ type: "GST", n: 1, total: 1050, tax: 50, due: 550 });
    expect(r[1]).toEqual({ type: "URD", n: 1, total: 1000, tax: 0, due: 1000 });
  });
});

describe("csv import", () => {
  it("maps header columns to products and reports unknown vendors", () => {
    const out = csvToProductsCheck(
      [
        ["Product", "Vendor", "Category", "Stock", "Cost", "GST %", "SP"],
        ["Nutella Spread", "Om Shiv Marketing", "Chocolates", "24", "180", "5", "200"],
        ["Ghost Item", "Nobody Ltd", "", "", "", "", ""],
      ],
      { vendors: [{ id: "v1", name: "Om Shiv Marketing", type: "GST", status: "active", phone: "", gstin: "", address: "", notes: "", createdAt: "2026-01-01" }], categories: [], settings: { defaultGst: 5, lowStockAt: 5, profitBase: "cp" } },
    );
    expect(out.rows[0]).toMatchObject({ name: "Nutella Spread", vendorId: "v1", stock: 24 });
    expect(out.rows[0]!.history[0]).toMatchObject({ cost: 180, sp: 200 });
    expect(out.rows[1]!.vendorId).toBe("");
    expect(out.problems.some((x) => x.includes("Nobody Ltd"))).toBe(true);
  });
});
