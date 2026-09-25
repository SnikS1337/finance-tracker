import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BudgetCard } from "../budgets/BudgetCard";
import { budgetProgress, byPeriod } from "../../lib/budgets";
import type { Budget, Category, Transaction } from "../../types";
import { t } from "../../i18n";

/** Category budgets shown on the dashboard at most (the rest live in Settings). */
const MAX_CATEGORY_BUDGETS = 3;

/**
 * Budget progress on the dashboard: the overall budgets (month and/or week,
 * each in its own current period), plus the category budgets that need
 * attention (80%+), most used first. Nothing is
 * rendered when there is nothing to show; everything is editable in Settings.
 */
export function BudgetOverview({
  budgets,
  categories,
  transactions,
  now,
}: {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  /** "Today": which month and week the budgets are for. */
  now: Date;
}) {
  const navigate = useNavigate();
  const { overall, attention } = useMemo(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const attentionItems = budgets
      .filter((b) => b.categoryId && categoryById.has(b.categoryId))
      .map((b) => ({ progress: budgetProgress(b, transactions, now), category: categoryById.get(b.categoryId!)! }))
      .filter((item) => item.progress.status !== "normal")
      .sort((a, b) => b.progress.percentage - a.progress.percentage)
      .slice(0, MAX_CATEGORY_BUDGETS);
    return {
      overall: budgets
        .filter((b) => !b.categoryId)
        .sort(byPeriod)
        .map((b) => budgetProgress(b, transactions, now)),
      attention: attentionItems,
    };
  }, [budgets, categories, transactions, now]);

  if (overall.length === 0 && attention.length === 0) return null;

  const openSettings = () => navigate("/settings");
  return (
    <section aria-label={t.dashboard.budgetsTitle} className="space-y-2.5">
      {overall.map((progress) => (
        <BudgetCard key={progress.budget.id} progress={progress} onEdit={openSettings} place="dashboard" />
      ))}
      {attention.map(({ progress, category }) => (
        <BudgetCard key={progress.budget.id} progress={progress} category={category} onEdit={openSettings} place="dashboard" />
      ))}
    </section>
  );
}
