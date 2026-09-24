import { describe, it, expect } from "vitest";
import type { Transaction } from "../../types";
import { summarize } from "../calculations";
import { getComparisonRanges, isDateKeyInRange, toDateKey } from "../date-utils";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    type: "expense",
    amount: 1000,
    categoryId: "cat-a",
    date: "2026-09-10",
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

const september = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30, 23, 59, 59, 999) };
const sep24 = new Date(2026, 8, 24, 15, 0);
const afterSeptember = new Date(2026, 9, 5);

describe("summarize — a period that is still running", () => {
  it("averages over the days that have elapsed, not the whole month", () => {
    // Real case from the app: 10 140 000 spent by the 24th.
    const transactions = [tx({ date: "2026-09-03", amount: 10_140_000 })];
    const s = summarize(transactions, september, sep24);
    expect(s.elapsedDays).toBe(24);
    expect(s.averagePerDay).toBe(10_140_000 / 24);
    // The old behaviour divided by all 30 days of September.
    expect(s.averagePerDay).not.toBe(10_140_000 / 30);
  });

  it("computes the median over elapsed days only", () => {
    // 13 of 24 elapsed days have spending → the median is a real spend, not 0.
    const transactions = Array.from({ length: 13 }, (_, i) =>
      tx({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, amount: 100 })
    );
    expect(summarize(transactions, september, sep24).medianPerDay).toBe(100);
    // Over the full 30-day month, 17 quiet days would drag it to 0.
    expect(summarize(transactions, september, afterSeptember).medianPerDay).toBe(0);
  });

  it("keeps full-period behaviour once the period is over", () => {
    const transactions = [tx({ date: "2026-09-01", amount: 3000 })];
    const s = summarize(transactions, september, afterSeptember);
    expect(s.elapsedDays).toBe(30);
    expect(s.averagePerDay).toBe(100);
  });

  it("returns zeros (not NaN) for a period that hasn't started yet", () => {
    const s = summarize([], september, new Date(2026, 7, 15));
    expect(s.elapsedDays).toBe(0);
    expect(s.averagePerDay).toBe(0);
    expect(s.medianPerDay).toBe(0);
  });

  it("counts a future-dated expense instead of silently dropping it from the average", () => {
    const transactions = [tx({ date: "2026-09-28", amount: 2800 })];
    const s = summarize(transactions, september, sep24);
    expect(s.elapsedDays).toBe(28);
    expect(s.averagePerDay).toBe(100);
  });
});

describe("summarize — single pass", () => {
  it("returns every figure the screens need, consistently", () => {
    const transactions = [
      tx({ type: "income", amount: 5000, categoryId: "salary", date: "2026-09-02" }),
      tx({ amount: 3000, categoryId: "food", date: "2026-09-02" }),
      tx({ amount: 1000, categoryId: "transport", date: "2026-09-05" }),
      tx({ amount: 999, date: "2026-08-31" }), // outside
      tx({ amount: 999, date: "2026-10-01" }), // outside
    ];
    const s = summarize(transactions, september, afterSeptember);
    expect(s.income).toBe(5000);
    expect(s.expenses).toBe(4000);
    expect(s.balance).toBe(1000);
    expect(s.transactionCount).toBe(3);
    expect(s.spendingDays).toBe(2);
    expect(s.dailyExpenses.size).toBe(30);
    expect(s.dailyExpenses.get("2026-09-02")).toBe(3000);
    expect(s.highest).toEqual({ date: "2026-09-02", total: 3000 });
    expect(s.lowest).toEqual({ date: "2026-09-05", total: 1000 });
    expect(s.expenseByCategory.map((c) => c.categoryId)).toEqual(["food", "transport"]);
    expect(s.expenseByCategory[0].percentage).toBe(75);
    expect(s.incomeByCategory).toEqual([{ categoryId: "salary", total: 5000, percentage: 100 }]);
  });

  it("handles an invalid range without throwing", () => {
    const s = summarize([tx({})], { start: new Date(NaN), end: new Date(NaN) });
    expect(s.expenses).toBe(0);
    expect(s.dailyExpenses.size).toBe(0);
  });
});

describe("isDateKeyInRange (string comparison)", () => {
  it("includes both endpoints and excludes neighbours", () => {
    expect(isDateKeyInRange("2026-09-01", september)).toBe(true);
    expect(isDateKeyInRange("2026-09-30", september)).toBe(true);
    expect(isDateKeyInRange("2026-08-31", september)).toBe(false);
    expect(isDateKeyInRange("2026-10-01", september)).toBe(false);
  });

  it("is false for an invalid range", () => {
    expect(isDateKeyInRange("2026-09-10", { start: new Date(NaN), end: new Date(NaN) })).toBe(false);
  });
});

describe("getComparisonRanges", () => {
  const keys = (r: { start: Date; end: Date }) => [toDateKey(r.start), toDateKey(r.end)];

  it("compares a running month with the same dates of the previous month", () => {
    const c = getComparisonRanges(september, sep24)!;
    expect(keys(c.current)).toEqual(["2026-09-01", "2026-09-24"]);
    expect(keys(c.previous)).toEqual(["2026-08-01", "2026-08-24"]);
  });

  it("compares a finished month with the whole previous month", () => {
    const c = getComparisonRanges(september, afterSeptember)!;
    expect(keys(c.current)).toEqual(["2026-09-01", "2026-09-30"]);
    expect(keys(c.previous)).toEqual(["2026-08-01", "2026-08-31"]);
  });

  it("never runs past the end of a shorter previous month", () => {
    const march = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 31) };
    const c = getComparisonRanges(march, new Date(2026, 3, 2))!;
    expect(keys(c.previous)).toEqual(["2026-02-01", "2026-02-28"]);
  });

  it("compares a running year with the same part of last year", () => {
    const year = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };
    const c = getComparisonRanges(year, sep24)!;
    expect(keys(c.current)).toEqual(["2026-01-01", "2026-09-24"]);
    expect(keys(c.previous)).toEqual(["2025-01-01", "2025-09-24"]);
  });

  it("uses the equally long stretch just before any other period", () => {
    const custom = { start: new Date(2026, 8, 10), end: new Date(2026, 8, 16) }; // 7 days, in the past
    const c = getComparisonRanges(custom, sep24)!;
    expect(keys(c.current)).toEqual(["2026-09-10", "2026-09-16"]);
    expect(keys(c.previous)).toEqual(["2026-09-03", "2026-09-09"]);
  });

  it("returns null for an invalid range", () => {
    expect(getComparisonRanges({ start: new Date(NaN), end: new Date(NaN) })).toBeNull();
  });
});
