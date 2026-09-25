import type { Transaction } from "../types";
import { summarize, calculatePercentageChange } from "./calculations";
import { getPresetRange, subDays } from "./date-utils";
import { endOfMonth, startOfMonth, format } from "date-fns";

/** The review card shows on the first days of a month. */
export const REVIEW_DAYS = 7;
const DISMISSED_KEY = "pft:monthlyReviewDismissed";

export interface MonthlyReview {
  /** "2026-08" — the month being reviewed (the one before today's). */
  monthKey: string;
  /** 0–11, for the month's name. */
  month: number;
  /** 0–11: the month before it, for the comparison sentence. */
  previousMonth: number;
  income: number;
  expenses: number;
  balance: number;
  averagePerDay: number;
  /** The biggest expense category and its share of expenses, %. */
  topCategory: { categoryId: string; percentage: number } | null;
  /** Expenses vs the month before, %; null when that month had none. */
  expenseChange: number | null;
}

/**
 * Last month's results, or null when there's nothing to show: past the first
 * days of the month, or no operations last month.
 */
export function monthlyReview(transactions: Transaction[], now: Date): MonthlyReview | null {
  if (now.getDate() > REVIEW_DAYS) return null;
  const range = getPresetRange("lastMonth", undefined, undefined, now);
  // `now` is after the month, so every day of it counts as elapsed.
  const summary = summarize(transactions, range, now);
  if (summary.transactionCount === 0) return null;

  const beforeStart = startOfMonth(subDays(range.start, 1));
  const before = summarize(transactions, { start: beforeStart, end: endOfMonth(beforeStart) }, now);
  const top = summary.expenseByCategory[0];

  return {
    monthKey: format(range.start, "yyyy-MM"),
    month: range.start.getMonth(),
    previousMonth: beforeStart.getMonth(),
    income: summary.income,
    expenses: summary.expenses,
    balance: summary.balance,
    averagePerDay: summary.averagePerDay,
    topCategory: top ? { categoryId: top.categoryId, percentage: top.percentage } : null,
    expenseChange: before.expenses > 0 ? calculatePercentageChange(summary.expenses, before.expenses) : null,
  };
}

/** "Hide until next month": remembers which month's review was closed. */
export function isReviewDismissed(monthKey: string): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === monthKey;
  } catch {
    return false;
  }
}

export function dismissReview(monthKey: string): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, monthKey);
  } catch {
    // Storage unavailable: the card just hides for this session.
  }
}
