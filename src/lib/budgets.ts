import type { Budget, BudgetPeriod, BudgetProgress, Transaction } from "../types";
import { calculateBudgetProgress } from "./calculations";
import { getPresetRange, type DateRange } from "./date-utils";

export const BUDGET_PERIODS: readonly BudgetPeriod[] = ["month", "week"];

/** Budgets saved before weekly budgets existed have no period: they're monthly. */
export const budgetPeriod = (budget: Pick<Budget, "period">): BudgetPeriod => budget.period ?? "month";

/** The current month or week (Mon–Sun) the budget applies to, around `now`. */
export function budgetRange(budget: Pick<Budget, "period">, now: Date): DateRange {
  return getPresetRange(budgetPeriod(budget) === "week" ? "thisWeek" : "thisMonth", undefined, undefined, now);
}

/** Progress of a budget in its own current period. */
export function budgetProgress(budget: Budget, transactions: Transaction[], now: Date): BudgetProgress {
  return calculateBudgetProgress(budget, transactions, budgetRange(budget, now));
}

/** Same scope and period (one budget per category and period). */
export const sameBudgetSlot = (a: Pick<Budget, "categoryId" | "period">, b: Pick<Budget, "categoryId" | "period">) =>
  a.categoryId === b.categoryId && budgetPeriod(a) === budgetPeriod(b);

/** Monthly first, then weekly. */
export const byPeriod = (a: Budget, b: Budget) =>
  BUDGET_PERIODS.indexOf(budgetPeriod(a)) - BUDGET_PERIODS.indexOf(budgetPeriod(b));
