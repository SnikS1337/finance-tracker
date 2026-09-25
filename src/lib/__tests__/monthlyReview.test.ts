import { describe, it, expect } from "vitest";
import { monthlyReview } from "../monthlyReview";
import type { Transaction } from "../../types";

const at = "2026-01-01T00:00:00.000Z";
const tx = (date: string, amount: number, categoryId = "food", type: "expense" | "income" = "expense"): Transaction => ({
  id: `${date}-${amount}-${categoryId}`,
  type,
  amount,
  categoryId,
  date,
  createdAt: at,
  updatedAt: at,
});

const data = [
  tx("2026-07-10", 1000), // July: 1 000
  tx("2026-08-02", 600),
  tx("2026-08-20", 300, "taxi"),
  tx("2026-08-25", 5000, "salary", "income"),
  tx("2026-09-01", 99999), // this month — not in the review
];

describe("monthlyReview", () => {
  it("sums last month on the first days of the new one", () => {
    const r = monthlyReview(data, new Date(2026, 8, 3))!;
    expect(r.monthKey).toBe("2026-08");
    expect(r.month).toBe(7);
    expect(r.previousMonth).toBe(6);
    expect(r.expenses).toBe(900);
    expect(r.income).toBe(5000);
    expect(r.balance).toBe(4100);
    expect(r.averagePerDay).toBeCloseTo(900 / 31);
    expect(r.topCategory).toEqual({ categoryId: "food", percentage: (600 / 900) * 100 });
    expect(r.expenseChange).toBeCloseTo(-10);
  });

  it("shows through the 7th, not after", () => {
    expect(monthlyReview(data, new Date(2026, 8, 7))).not.toBeNull();
    expect(monthlyReview(data, new Date(2026, 8, 8))).toBeNull();
  });

  it("is hidden when last month had no operations", () => {
    expect(monthlyReview([tx("2026-07-10", 1000)], new Date(2026, 8, 1))).toBeNull();
  });

  it("has no comparison when the month before had no expenses", () => {
    const r = monthlyReview([tx("2026-08-02", 600)], new Date(2026, 8, 1))!;
    expect(r.expenseChange).toBeNull();
  });

  it("works across the new year (January reviews December, compared with November)", () => {
    const r = monthlyReview([tx("2025-11-05", 200), tx("2025-12-05", 300)], new Date(2026, 0, 2))!;
    expect(r.monthKey).toBe("2025-12");
    expect(r.month).toBe(11);
    expect(r.previousMonth).toBe(10);
    expect(r.expenseChange).toBeCloseTo(50);
  });

  it("income-only month: no top category", () => {
    const r = monthlyReview([tx("2026-08-25", 5000, "salary", "income")], new Date(2026, 8, 1))!;
    expect(r.topCategory).toBeNull();
    expect(r.expenses).toBe(0);
  });
});
