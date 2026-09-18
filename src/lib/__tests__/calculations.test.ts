import { describe, it, expect } from "vitest";
import type { Transaction } from "../../types";
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateBalance,
  calculateAverageDailyExpense,
  calculateMedianDailyExpense,
  calculateCategoryTotals,
  calculateHighestSpendingDay,
  calculateLowestSpendingDay,
  calculatePercentageChange,
  calculateBudgetProgress,
  calculateSpendingDaysCount,
} from "../calculations";
import { getPresetRange } from "../date-utils";
import type { Budget } from "../../types";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    type: "expense",
    amount: 1000,
    categoryId: "cat-a",
    date: "2026-09-10",
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

const range = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) }; // Sept 2026

describe("totals", () => {
  it("sums income and expenses separately and computes balance", () => {
    const transactions = [
      tx({ type: "income", amount: 5000, date: "2026-09-05" }),
      tx({ type: "expense", amount: 2000, date: "2026-09-05" }),
      tx({ type: "expense", amount: 1000, date: "2026-09-06" }),
    ];
    expect(calculateTotalIncome(transactions, range)).toBe(5000);
    expect(calculateTotalExpenses(transactions, range)).toBe(3000);
    expect(calculateBalance(transactions, range)).toBe(2000);
  });

  it("excludes transactions outside the range", () => {
    const transactions = [tx({ date: "2026-08-31", amount: 999 }), tx({ date: "2026-09-01", amount: 500 })];
    expect(calculateTotalExpenses(transactions, range)).toBe(500);
  });
});

describe("average and median daily expense", () => {
  it("counts zero-spend days toward the average (30-day September)", () => {
    const transactions = [tx({ date: "2026-09-01", amount: 3000 })];
    // 3000 total / 30 calendar days in range = 100
    expect(calculateAverageDailyExpense(transactions, range)).toBe(100);
  });

  it("computes median across all calendar days including zero-spend days", () => {
    const transactions = [
      tx({ date: "2026-09-01", amount: 100 }),
      tx({ date: "2026-09-02", amount: 200 }),
    ];
    // 30 days total, 28 are zero -> median is 0
    expect(calculateMedianDailyExpense(transactions, range)).toBe(0);
  });

  it("counts only days that actually had spending", () => {
    const transactions = [tx({ date: "2026-09-01" }), tx({ date: "2026-09-01" }), tx({ date: "2026-09-02" })];
    expect(calculateSpendingDaysCount(transactions, range)).toBe(2);
  });
});

describe("category totals", () => {
  it("computes percentage of total per category", () => {
    const transactions = [
      tx({ categoryId: "food", amount: 3000 }),
      tx({ categoryId: "transport", amount: 1000 }),
    ];
    const totals = calculateCategoryTotals(transactions, range, "expense");
    expect(totals[0]).toMatchObject({ categoryId: "food", total: 3000, percentage: 75 });
    expect(totals[1]).toMatchObject({ categoryId: "transport", total: 1000, percentage: 25 });
  });

  it("returns an empty array with no matching transactions", () => {
    expect(calculateCategoryTotals([], range, "expense")).toEqual([]);
  });
});

describe("highest / lowest spending day", () => {
  it("finds the highest spending day", () => {
    const transactions = [
      tx({ date: "2026-09-01", amount: 500 }),
      tx({ date: "2026-09-02", amount: 5000 }),
    ];
    expect(calculateHighestSpendingDay(transactions, range)).toMatchObject({ date: "2026-09-02", total: 5000 });
  });

  it("ignores zero-spend days for the lowest spending day", () => {
    const transactions = [tx({ date: "2026-09-01", amount: 500 }), tx({ date: "2026-09-02", amount: 100 })];
    expect(calculateLowestSpendingDay(transactions, range)).toMatchObject({ date: "2026-09-02", total: 100 });
  });

  it("returns null when there are no transactions", () => {
    expect(calculateHighestSpendingDay([], range)).toBeNull();
    expect(calculateLowestSpendingDay([], range)).toBeNull();
  });
});

describe("percentage change", () => {
  it("computes a positive change", () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it("returns null when the previous value is zero and current is non-zero (undefined %)", () => {
    expect(calculatePercentageChange(100, 0)).toBeNull();
  });

  it("returns 0 when both are zero", () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });
});

describe("budget progress", () => {
  const budget: Budget = {
    id: "b1",
    categoryId: "food",
    amount: 1000,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  it("marks status normal below 80%", () => {
    const transactions = [tx({ categoryId: "food", amount: 500 })];
    expect(calculateBudgetProgress(budget, transactions, range).status).toBe("normal");
  });

  it("marks status approaching between 80% and 100%", () => {
    const transactions = [tx({ categoryId: "food", amount: 850 })];
    expect(calculateBudgetProgress(budget, transactions, range).status).toBe("approaching");
  });

  it("marks status exceeded at or above 100%", () => {
    const transactions = [tx({ categoryId: "food", amount: 1200 })];
    const progress = calculateBudgetProgress(budget, transactions, range);
    expect(progress.status).toBe("exceeded");
    expect(progress.percentage).toBe(120);
  });

  it("only counts expenses in the budget's own category", () => {
    const transactions = [tx({ categoryId: "transport", amount: 5000 })];
    expect(calculateBudgetProgress(budget, transactions, range).spent).toBe(0);
  });
});

describe("getPresetRange", () => {
  it("produces a range that includes both endpoints of 'thisMonth'", () => {
    const r = getPresetRange("thisMonth");
    expect(r.start.getDate()).toBe(1);
    expect(r.end.getMonth()).toBe(r.start.getMonth());
  });
});
