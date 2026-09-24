import type { Transaction, Budget, BudgetProgress, BudgetStatus } from "../types";
import { allDateKeysInRange, rangeKeys, toDateKey, type DateRange } from "./date-utils";

export interface CategoryTotal {
  categoryId: string;
  total: number;
  percentage: number;
}

export interface DaySpend {
  date: string;
  total: number;
}

/** Everything the dashboard, analytics and PNG report show for one period, computed in a single pass. */
export interface PeriodSummary {
  income: number;
  expenses: number;
  balance: number;
  /** Operations (income + expense) dated inside the period. */
  transactionCount: number;
  /** Expense total for every calendar day of the period (₫0 for quiet days), in date order. */
  dailyExpenses: Map<string, number>;
  /**
   * Days of the period that have actually happened: a period that is still
   * running counts up to today, not to its last day. Expenses dated in the
   * future (e.g. imported) extend it to their date so nothing is dropped.
   */
  elapsedDays: number;
  /** Expenses per elapsed day (quiet days count as ₫0). */
  averagePerDay: number;
  /** Median daily expense over the elapsed days (quiet days count as ₫0). */
  medianPerDay: number;
  /** Days with at least one expense. */
  spendingDays: number;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  highest: DaySpend | null;
  /** Lowest day *among days that had spending* — a ₫0 day isn't informative. */
  lowest: DaySpend | null;
}

function toCategoryTotals(byCategory: Map<string, number>, grand: number): CategoryTotal[] {
  return [...byCategory.entries()]
    .map(([categoryId, total]) => ({ categoryId, total, percentage: grand > 0 ? (total / grand) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const EMPTY_SUMMARY: PeriodSummary = {
  income: 0,
  expenses: 0,
  balance: 0,
  transactionCount: 0,
  dailyExpenses: new Map(),
  elapsedDays: 0,
  averagePerDay: 0,
  medianPerDay: 0,
  spendingDays: 0,
  expenseByCategory: [],
  incomeByCategory: [],
  highest: null,
  lowest: null,
};

/**
 * Single-pass summary of a period. `now` is injectable so "how much of the
 * period has elapsed" is testable; it defaults to the current moment.
 */
export function summarize(transactions: Transaction[], range: DateRange, now: Date = new Date()): PeriodSummary {
  const keys = rangeKeys(range);
  if (!keys) return { ...EMPTY_SUMMARY, dailyExpenses: new Map() };
  const { startKey, endKey } = keys;

  const dailyExpenses = new Map<string, number>();
  for (const key of allDateKeysInRange(range)) dailyExpenses.set(key, 0);

  let income = 0;
  let expenses = 0;
  let transactionCount = 0;
  let lastExpenseKey = "";
  const expenseByCategory = new Map<string, number>();
  const incomeByCategory = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.date < startKey || tx.date > endKey) continue;
    transactionCount++;
    if (tx.type === "income") {
      income += tx.amount;
      incomeByCategory.set(tx.categoryId, (incomeByCategory.get(tx.categoryId) ?? 0) + tx.amount);
    } else {
      expenses += tx.amount;
      expenseByCategory.set(tx.categoryId, (expenseByCategory.get(tx.categoryId) ?? 0) + tx.amount);
      dailyExpenses.set(tx.date, (dailyExpenses.get(tx.date) ?? 0) + tx.amount);
      if (tx.date > lastExpenseKey) lastExpenseKey = tx.date;
    }
  }

  const todayKey = toDateKey(now);
  const elapsedUntil = lastExpenseKey > todayKey ? lastExpenseKey : todayKey;
  const elapsedValues: number[] = [];
  let spendingDays = 0;
  let highest: DaySpend | null = null;
  let lowest: DaySpend | null = null;
  for (const [date, total] of dailyExpenses) {
    if (date <= elapsedUntil) elapsedValues.push(total);
    if (total <= 0) continue;
    spendingDays++;
    if (!highest || total > highest.total) highest = { date, total };
    if (!lowest || total < lowest.total) lowest = { date, total };
  }

  const elapsedDays = elapsedValues.length;
  return {
    income,
    expenses,
    balance: income - expenses,
    transactionCount,
    dailyExpenses,
    elapsedDays,
    averagePerDay: elapsedDays > 0 ? expenses / elapsedDays : 0,
    medianPerDay: median(elapsedValues.sort((a, b) => a - b)),
    spendingDays,
    expenseByCategory: toCategoryTotals(expenseByCategory, expenses),
    incomeByCategory: toCategoryTotals(incomeByCategory, income),
    highest,
    lowest,
  };
}

// ---------------------------------------------------------------------------
// Single-value helpers (thin wrappers over `summarize`, kept for call sites and
// tests that only need one number).
// ---------------------------------------------------------------------------

export function calculateTotalIncome(transactions: Transaction[], range: DateRange): number {
  return summarize(transactions, range).income;
}

export function calculateTotalExpenses(transactions: Transaction[], range: DateRange): number {
  return summarize(transactions, range).expenses;
}

export function calculateBalance(transactions: Transaction[], range: DateRange): number {
  return summarize(transactions, range).balance;
}

/** Total expense per calendar day within `range`, including ₫0 for days with no spending. */
export function calculateDailyTotals(transactions: Transaction[], range: DateRange): Map<string, number> {
  return summarize(transactions, range).dailyExpenses;
}

/** Average expense per *elapsed* calendar day (quiet days count as ₫0; future days don't count). */
export function calculateAverageDailyExpense(transactions: Transaction[], range: DateRange, now?: Date): number {
  return summarize(transactions, range, now).averagePerDay;
}

/** Median of daily expense totals over the elapsed days (quiet days included). */
export function calculateMedianDailyExpense(transactions: Transaction[], range: DateRange, now?: Date): number {
  return summarize(transactions, range, now).medianPerDay;
}

export function calculateSpendingDaysCount(transactions: Transaction[], range: DateRange): number {
  return summarize(transactions, range).spendingDays;
}

export function calculateCategoryTotals(transactions: Transaction[], range: DateRange, type: "income" | "expense"): CategoryTotal[] {
  const summary = summarize(transactions, range);
  return type === "income" ? summary.incomeByCategory : summary.expenseByCategory;
}

export const calculateIncomeCategoryTotals = (transactions: Transaction[], range: DateRange) =>
  calculateCategoryTotals(transactions, range, "income");

export const calculateExpenseCategoryTotals = (transactions: Transaction[], range: DateRange) =>
  calculateCategoryTotals(transactions, range, "expense");

export function calculateHighestSpendingDay(transactions: Transaction[], range: DateRange): DaySpend | null {
  return summarize(transactions, range).highest;
}

/** Lowest spending day *among days that had spending* — a day with ₫0 isn't informative here. */
export function calculateLowestSpendingDay(transactions: Transaction[], range: DateRange): DaySpend | null {
  return summarize(transactions, range).lowest;
}

/** Percentage change from `previous` to `current`. Returns null when undefined (previous is 0). */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function calculateBudgetProgress(budget: Budget, transactions: Transaction[], range: DateRange): BudgetProgress {
  const keys = rangeKeys(range);
  let spent = 0;
  if (keys) {
    for (const t of transactions) {
      if (t.type !== "expense" || t.date < keys.startKey || t.date > keys.endKey) continue;
      if (budget.categoryId && t.categoryId !== budget.categoryId) continue;
      spent += t.amount;
    }
  }
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  let status: BudgetStatus = "normal";
  if (percentage >= 100) status = "exceeded";
  else if (percentage >= 80) status = "approaching";
  return { budget, spent, percentage, status };
}
