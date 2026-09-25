import { describe, it, expect } from "vitest";
import { orderCategoriesByUsage } from "../categoryOrder";
import { findBudgetCrossing } from "../budgetAlerts";
import { matchesSearch } from "../search";
import type { Budget, Category, Transaction } from "../../types";

const cat = (id: string, over: Partial<Category> = {}): Category => ({
  id,
  name: id,
  icon: "•",
  color: "#000",
  type: "expense",
  createdAt: "",
  ...over,
});
const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: "expense",
  amount: 1000,
  categoryId: "a",
  date: "2026-09-10",
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "",
  ...over,
});
const budget = (over: Partial<Budget>): Budget => ({ id: "b", amount: 1000, createdAt: "", updatedAt: "", ...over });
/** "Now" for budget checks: Thursday 10 Sep 2026 (its week is Mon 7 – Sun 13 Sep). */
const september = new Date(2026, 8, 10, 12);

describe("orderCategoriesByUsage", () => {
  const categories = [cat("a"), cat("b"), cat("c"), cat("d")];

  it("puts the most recently used category first, then by frequency, then original order", () => {
    const transactions = [
      tx({ categoryId: "c", createdAt: "2026-09-01T00:00:00Z" }),
      tx({ categoryId: "c", createdAt: "2026-09-02T00:00:00Z" }),
      tx({ categoryId: "c", createdAt: "2026-09-03T00:00:00Z" }),
      tx({ categoryId: "b", createdAt: "2026-09-04T00:00:00Z" }),
      tx({ categoryId: "d", createdAt: "2026-09-20T00:00:00Z" }), // most recent
    ];
    expect(orderCategoriesByUsage(categories, transactions).map((c) => c.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("keeps the original order when nothing has been used", () => {
    expect(orderCategoriesByUsage(categories, []).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("findBudgetCrossing", () => {
  const categories = [cat("food", { name: "Еда" }), cat("taxi")];

  it("reports crossing 80% and 100%", () => {
    const b = [budget({ categoryId: "food" })];
    const before = [tx({ categoryId: "food", amount: 700 })];
    expect(findBudgetCrossing(b, categories, before, [...before, tx({ categoryId: "food", amount: 150 })], september)).toMatchObject({
      threshold: 80,
      percent: 85,
    });
    expect(findBudgetCrossing(b, categories, before, [...before, tx({ categoryId: "food", amount: 400 })], september)).toMatchObject({
      threshold: 100,
      percent: 110,
    });
  });

  it("stays quiet when the level was already passed or not reached", () => {
    const b = [budget({ categoryId: "food" })];
    const at85 = [tx({ categoryId: "food", amount: 850 })];
    expect(findBudgetCrossing(b, categories, at85, [...at85, tx({ categoryId: "food", amount: 50 })], september)).toBeNull();
    const low = [tx({ categoryId: "food", amount: 100 })];
    expect(findBudgetCrossing(b, categories, low, [...low, tx({ categoryId: "food", amount: 100 })], september)).toBeNull();
  });

  it("ignores other categories, other months, orphaned budgets and income", () => {
    const b = [budget({ categoryId: "food" }), budget({ id: "orphan", categoryId: "gone" })];
    expect(findBudgetCrossing(b, categories, [], [tx({ categoryId: "taxi", amount: 5000 })], september)).toBeNull();
    expect(findBudgetCrossing(b, categories, [], [tx({ categoryId: "food", amount: 5000, date: "2026-08-31" })], september)).toBeNull();
    expect(findBudgetCrossing(b, categories, [], [tx({ categoryId: "gone", amount: 5000 })], september)).toBeNull();
    expect(findBudgetCrossing(b, categories, [], [tx({ categoryId: "food", amount: 5000, type: "income" })], september)).toBeNull();
  });

  it("prefers the more severe level, then the category budget over the overall one", () => {
    const b = [budget({ id: "overall", amount: 10_000 }), budget({ id: "food", categoryId: "food", amount: 1000 })];
    const added = [tx({ categoryId: "food", amount: 900 })];
    // food: 0 → 90% (80 crossed); overall: 0 → 9% → the food budget is reported.
    expect(findBudgetCrossing(b, categories, [], added, september)?.budget.id).toBe("food");

    const same = [budget({ id: "overall", amount: 1000 }), budget({ id: "food", categoryId: "food", amount: 1000 })];
    expect(findBudgetCrossing(same, categories, [], added, september)?.budget.id).toBe("food");

    const severe = [budget({ id: "overall", amount: 800 }), budget({ id: "food", categoryId: "food", amount: 1000 })];
    // overall crosses 100%, food only 80% → overall wins.
    expect(findBudgetCrossing(severe, categories, [], added, september)?.budget.id).toBe("overall");
  });
});

describe("weekly budgets", () => {
  const categories = [cat("food", { name: "Еда" })];

  it("count only the current week (Mon–Sun)", () => {
    const b = [budget({ id: "w", categoryId: "food", period: "week", amount: 1000 })];
    const lastWeek = [tx({ categoryId: "food", amount: 5000, date: "2026-09-06" })]; // Sunday before
    expect(findBudgetCrossing(b, categories, lastWeek, [...lastWeek, tx({ categoryId: "food", amount: 500 })], september)).toBeNull();
    expect(findBudgetCrossing(b, categories, [], [tx({ categoryId: "food", amount: 900, date: "2026-09-07" })], september)).toMatchObject({
      threshold: 80,
    });
  });

  it("a monthly and a weekly budget for the same scope live side by side", async () => {
    const { budgetProgress, sameBudgetSlot } = await import("../budgets");
    const month = budget({ id: "m", amount: 10_000 });
    const week = budget({ id: "w", amount: 1_000, period: "week" });
    expect(sameBudgetSlot(month, week)).toBe(false);
    expect(sameBudgetSlot(month, { categoryId: undefined, period: "month" })).toBe(true);
    const txs = [tx({ amount: 700, date: "2026-09-02" }), tx({ amount: 300, date: "2026-09-08" })];
    expect(budgetProgress(month, txs, september).spent).toBe(1000);
    expect(budgetProgress(week, txs, september).spent).toBe(300);
  });
});

describe("matchesSearch", () => {
  const t45 = tx({ amount: 45_000 });

  it("matches the category name, case-insensitively", () => {
    expect(matchesSearch(t45, "Кафе", "каф")).toBe(true);
    expect(matchesSearch(t45, "Кафе", "такси")).toBe(false);
  });

  it("matches the amount regardless of spaces and currency sign", () => {
    expect(matchesSearch(t45, "Кафе", "45000")).toBe(true);
    expect(matchesSearch(t45, "Кафе", "45 000")).toBe(true);
    expect(matchesSearch(t45, "Кафе", "45 000 ₫")).toBe(true);
    expect(matchesSearch(t45, "Кафе", "46000")).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(matchesSearch(t45, "Кафе", "   ")).toBe(true);
  });
});
