import type { Transaction, Budget, BudgetProgress, BudgetStatus } from "../types";
import { allDateKeysInRange, isDateKeyInRange, type DateRange } from "./date-utils";

function inRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => isDateKeyInRange(t.date, range));
}

export function calculateTotalIncome(transactions: Transaction[], range: DateRange): number {
  return inRange(transactions, range)
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateTotalExpenses(transactions: Transaction[], range: DateRange): number {
  return inRange(transactions, range)
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateBalance(transactions: Transaction[], range: DateRange): number {
  return calculateTotalIncome(transactions, range) - calculateTotalExpenses(transactions, range);
}

/** Total expense per calendar day within `range`, including ₫0 for days with no spending. */
export function calculateDailyTotals(transactions: Transaction[], range: DateRange): Map<string, number> {
  const totals = new Map<string, number>();
  for (const key of allDateKeysInRange(range)) totals.set(key, 0);
  for (const t of inRange(transactions, range)) {
    if (t.type !== "expense") continue;
    totals.set(t.date, (totals.get(t.date) ?? 0) + t.amount);
  }
  return totals;
}

/** Average expense per *calendar* day in the range (days with no spending count as 0). */
export function calculateAverageDailyExpense(transactions: Transaction[], range: DateRange): number {
  const daily = calculateDailyTotals(transactions, range);
  if (daily.size === 0) return 0;
  const sum = [...daily.values()].reduce((a, b) => a + b, 0);
  return sum / daily.size;
}

/** Median of daily expense totals across all calendar days (0-spend days included). */
export function calculateMedianDailyExpense(transactions: Transaction[], range: DateRange): number {
  const values = [...calculateDailyTotals(transactions, range).values()].sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}

export function calculateSpendingDaysCount(transactions: Transaction[], range: DateRange): number {
  const daily = calculateDailyTotals(transactions, range);
  return [...daily.values()].filter((v) => v > 0).length;
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  percentage: number;
}

export function calculateCategoryTotals(transactions: Transaction[], range: DateRange, type: "income" | "expense"): CategoryTotal[] {
  const filtered = inRange(transactions, range).filter((t) => t.type === type);
  const grand = filtered.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = new Map<string, number>();
  for (const t of filtered) {
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      percentage: grand > 0 ? (total / grand) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export const calculateIncomeCategoryTotals = (transactions: Transaction[], range: DateRange) =>
  calculateCategoryTotals(transactions, range, "income");

export const calculateExpenseCategoryTotals = (transactions: Transaction[], range: DateRange) =>
  calculateCategoryTotals(transactions, range, "expense");

export interface DaySpend {
  date: string;
  total: number;
}

export function calculateHighestSpendingDay(transactions: Transaction[], range: DateRange): DaySpend | null {
  const spendingDays = [...calculateDailyTotals(transactions, range).entries()].filter(([, total]) => total > 0);
  if (spendingDays.length === 0) return null;
  const [date, total] = spendingDays.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return { date, total };
}

/** Lowest spending day *among days that had spending* — a day with ₫0 isn't informative here. */
export function calculateLowestSpendingDay(transactions: Transaction[], range: DateRange): DaySpend | null {
  const spendingDays = [...calculateDailyTotals(transactions, range).entries()].filter(([, total]) => total > 0);
  if (spendingDays.length === 0) return null;
  const [date, total] = spendingDays.reduce((best, cur) => (cur[1] < best[1] ? cur : best));
  return { date, total };
}

/** Percentage change from `previous` to `current`. Returns null when undefined (previous is 0). */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function calculateBudgetProgress(budget: Budget, transactions: Transaction[], range: DateRange): BudgetProgress {
  const relevant = inRange(transactions, range).filter(
    (t) => t.type === "expense" && (budget.categoryId ? t.categoryId === budget.categoryId : true)
  );
  const spent = relevant.reduce((sum, t) => sum + t.amount, 0);
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  let status: BudgetStatus = "normal";
  if (percentage >= 100) status = "exceeded";
  else if (percentage >= 80) status = "approaching";
  return { budget, spent, percentage, status };
}
