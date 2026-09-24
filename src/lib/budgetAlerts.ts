import type { Budget, Category, Transaction } from "../types";
import { calculateBudgetProgress } from "./calculations";
import type { DateRange } from "./date-utils";

/** Levels worth telling the user about, most severe first. */
const THRESHOLDS = [100, 80] as const;

export interface BudgetCrossing {
  budget: Budget;
  /** Category of a category budget; undefined for the overall monthly budget. */
  category?: Category;
  /** Usage after the change, rounded down (a budget at 99.6% isn't "100%"). */
  percent: number;
  threshold: (typeof THRESHOLDS)[number];
}

/**
 * The most important budget threshold (80% or 100%) that a change to the
 * transactions has just crossed upwards within `range` (the current month),
 * or null. Category budgets win ties over the overall budget, being more specific.
 */
export function findBudgetCrossing(
  budgets: Budget[],
  categories: Category[],
  before: Transaction[],
  after: Transaction[],
  range: DateRange
): BudgetCrossing | null {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  let best: BudgetCrossing | null = null;
  for (const budget of budgets) {
    const category = budget.categoryId ? categoryById.get(budget.categoryId) : undefined;
    if (budget.categoryId && !category) continue; // orphaned budget
    const was = calculateBudgetProgress(budget, before, range).percentage;
    const now = calculateBudgetProgress(budget, after, range).percentage;
    const threshold = THRESHOLDS.find((level) => was < level && now >= level);
    if (!threshold) continue;
    const candidate: BudgetCrossing = { budget, category, percent: Math.floor(now), threshold };
    if (
      !best ||
      candidate.threshold > best.threshold ||
      (candidate.threshold === best.threshold && candidate.category && !best.category)
    ) {
      best = candidate;
    }
  }
  return best;
}
