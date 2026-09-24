import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BudgetCard } from "../budgets/BudgetCard";
import { calculateBudgetProgress } from "../../lib/calculations";
import type { DateRange } from "../../lib/date-utils";
import type { Budget, Category, Transaction } from "../../types";
import { t } from "../../i18n";

/** Category budgets shown on the dashboard at most (the rest live in Settings). */
const MAX_CATEGORY_BUDGETS = 3;

/**
 * Budget progress on the dashboard: the overall monthly budget (if set), plus
 * the category budgets that need attention (80%+), most used first. Nothing is
 * rendered when there is nothing to show; everything is editable in Settings.
 */
export function BudgetOverview({
  budgets,
  categories,
  transactions,
  range,
}: {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  range: DateRange;
}) {
  const navigate = useNavigate();
  const { overall, attention } = useMemo(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const overallBudget = budgets.find((b) => !b.categoryId);
    const attentionItems = budgets
      .filter((b) => b.categoryId && categoryById.has(b.categoryId))
      .map((b) => ({ progress: calculateBudgetProgress(b, transactions, range), category: categoryById.get(b.categoryId!)! }))
      .filter((item) => item.progress.status !== "normal")
      .sort((a, b) => b.progress.percentage - a.progress.percentage)
      .slice(0, MAX_CATEGORY_BUDGETS);
    return {
      overall: overallBudget ? calculateBudgetProgress(overallBudget, transactions, range) : null,
      attention: attentionItems,
    };
  }, [budgets, categories, transactions, range]);

  if (!overall && attention.length === 0) return null;

  const openSettings = () => navigate("/settings");
  return (
    <section aria-label={t.dashboard.budgetsTitle} className="space-y-2.5">
      {overall && <BudgetCard progress={overall} onEdit={openSettings} />}
      {attention.map(({ progress, category }) => (
        <BudgetCard key={progress.budget.id} progress={progress} category={category} onEdit={openSettings} />
      ))}
    </section>
  );
}
