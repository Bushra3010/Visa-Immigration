import { describe, expect, it } from "vitest";
import { applyMarkup, type MarkupRule } from "@/lib/travel/markup";

const rule = (overrides: Partial<MarkupRule>): MarkupRule => ({
  id: crypto.randomUUID(), name: "r", product: "flight", markupType: "fixed", value: 0, isPromotional: false, priority: 0, isActive: true, ...overrides,
});

describe("applyMarkup", () => {
  it("applies the PRD example: ₹20,000 + ₹1,000 fixed = ₹21,000", () => {
    const r = applyMarkup(20000, [rule({ value: 1000 })], { product: "flight", supplier: "mock" });
    expect(r).toMatchObject({ supplierAmount: 20000, markupAmount: 1000, customerAmount: 21000 });
  });

  it("applies percentage markup", () => {
    const r = applyMarkup(10000, [rule({ product: "hotel", markupType: "percentage", value: 8 })], { product: "hotel", supplier: "mock" });
    expect(r.customerAmount).toBe(10800);
  });

  it("prefers the most specific matching rule over priority", () => {
    const rules = [rule({ id: "general", value: 500, priority: 99 }), rule({ id: "airline", value: 1500, airlineCode: "AI" })];
    expect(applyMarkup(10000, rules, { product: "flight", supplier: "mock", airlineCode: "AI" }).appliedRuleIds).toEqual(["airline"]);
    expect(applyMarkup(10000, rules, { product: "flight", supplier: "mock", airlineCode: "EK" }).appliedRuleIds).toEqual(["general"]);
  });

  it("breaks ties on priority", () => {
    const rules = [rule({ id: "low", value: 100, priority: 1 }), rule({ id: "high", value: 200, priority: 5 })];
    expect(applyMarkup(1000, rules, { product: "flight", supplier: "mock" }).markupAmount).toBe(200);
  });

  it("ignores inactive, other-product and out-of-window rules", () => {
    const now = new Date("2026-09-17T00:00:00Z");
    const rules = [
      rule({ value: 900, isActive: false }),
      rule({ value: 800, product: "hotel" }),
      rule({ value: 700, startsAt: "2026-10-01T00:00:00Z" }),
      rule({ value: 600, endsAt: "2026-09-01T00:00:00Z" }),
    ];
    expect(applyMarkup(1000, rules, { product: "flight", supplier: "mock", now }).markupAmount).toBe(0);
  });

  it("never discounts below the supplier fare", () => {
    const rules = [rule({ value: 1000 }), rule({ value: -5000, isPromotional: true })];
    const r = applyMarkup(20000, rules, { product: "flight", supplier: "mock" });
    expect(r.discountAmount).toBe(1000);
    expect(r.customerAmount).toBe(20000);
  });
});

describe("applyMarkup rounding", () => {
  it("rounds customer price up to whole currency units", () => {
    const r = applyMarkup(24315, [rule({ product: "hotel", markupType: "percentage", value: 8 })], { product: "hotel", supplier: "mock" });
    expect(Number.isInteger(r.customerAmount)).toBe(true);
    expect(r.customerAmount).toBe(26261);
  });
});
