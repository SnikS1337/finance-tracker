/**
 * Budgets are monthly by definition (the only period that matters for a
 * recurring "how much can I spend this month" question). `categoryId` is
 * undefined for the overall monthly budget.
 */
export interface Budget {
  id: string;
  categoryId?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export type NewBudgetInput = Pick<Budget, "categoryId" | "amount">;

export type BudgetStatus = "normal" | "approaching" | "exceeded";

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  percentage: number;
  status: BudgetStatus;
}
