import { describe, expect, it } from "vitest";
import { profitOf } from "./store";

describe("profit", () => {
  it("is selling price minus cost price", () => {
    expect(profitOf({ cost: 180, sp: 200 })).toBe(20);
  });
  it("uses discounted CP instead of cost when present", () => {
    expect(profitOf({ cost: 50, sp: 80, cp: 70 })).toBe(10);
  });
});

import { applyBulkPrice as abp } from "./store";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("applyBulkPrice", () => {
  const e = { id: "a", date: "2026-01-01", cost: 100, gst: 5, sp: 150 };
  i2("adds 10% to both", () => { const r = abp(e, "both", "pct", 10, "2026-02-01"); e2([r.cost, r.sp]).toEqual([110, 165]); });
  i2("adds ₹5 to SP only", () => { const r = abp(e, "sp", "amt", 5, "x"); e2([r.cost, r.sp]).toEqual([100, 155]); });
  i2("never goes below zero", () => e2(abp(e, "cost", "amt", -500, "x").cost).toBe(0));
});
