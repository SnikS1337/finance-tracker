/** How often a budget resets. Weeks run Monday–Sunday. */
export type BudgetPeriod = "month" | "week";

/**
 * A spending limit for the current month or week, overall or for one
 * category. `categoryId` is undefined for an overall budget; `period` is
 * undefined in budgets saved before weekly budgets existed (= "month").
 * At most one budget per (category, period).
 */
export interface Budget {
  id: string;
  categoryId?: string;
  period?: BudgetPeriod;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export type NewBudgetInput = Pick<Budget, "categoryId" | "amount"> & { period: BudgetPeriod };

export type BudgetStatus = "normal" | "approaching" | "exceeded";

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  percentage: number;
  status: BudgetStatus;
}
