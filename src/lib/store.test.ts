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
