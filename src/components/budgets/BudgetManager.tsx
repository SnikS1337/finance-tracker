import { useState } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { useToday } from "../../hooks/useToday";
import { Button } from "../ui/Button";
import { BudgetCard } from "./BudgetCard";
import { BudgetFormSheet } from "./BudgetFormSheet";
import { BUDGET_PERIODS, budgetPeriod, budgetProgress, byPeriod } from "../../lib/budgets";
import { fromDateKey } from "../../lib/date-utils";
import type { Budget, BudgetPeriod } from "../../types";
import { t } from "../../i18n";

const SET_LABEL: Record<BudgetPeriod, string> = { month: t.budgets.setMonthlyBudget, week: t.budgets.setWeeklyBudget };

/** What the form is open for: an existing budget, or a new one for a scope. */
type Editing = { budget: Budget | null; categoryId?: string; period: BudgetPeriod };

export function BudgetManager() {
  const { budgets, categories, transactions, upsertBudget, removeBudget } = useAppData();
  const { showToast } = useToast();
  const now = fromDateKey(useToday());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>({ budget: null, period: "month" });

  // Budgets of categories that no longer exist are hidden (not shown as a
  // second overall budget).
  const categoryIds = new Set(categories.map((c) => c.id));
  const overall = budgets.filter((b) => !b.categoryId).sort(byPeriod);
  const categoryBudgets = budgets
    .filter((b): b is Budget & { categoryId: string } => !!b.categoryId && categoryIds.has(b.categoryId))
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId) || byPeriod(a, b));

  /** Periods already used for a scope (overall = undefined). */
  const takenPeriods = (categoryId?: string) =>
    budgets.filter((b) => b.categoryId === categoryId).map(budgetPeriod);

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.isArchived);
  // A category can have a monthly and a weekly budget: offer it while one is free.
  const categoriesWithFreePeriod = expenseCategories.filter((c) => takenPeriods(c.id).length < BUDGET_PERIODS.length);

  function openNew(categoryId: string | undefined, period?: BudgetPeriod) {
    const taken = takenPeriods(categoryId);
    setEditing({ budget: null, categoryId, period: period ?? BUDGET_PERIODS.find((p) => !taken.includes(p)) ?? "month" });
    setFormOpen(true);
  }

  function openExisting(budget: Budget) {
    setEditing({ budget, categoryId: budget.categoryId, period: budgetPeriod(budget) });
    setFormOpen(true);
  }

  const overallMissing = BUDGET_PERIODS.filter((p) => !overall.some((b) => budgetPeriod(b) === p));

  return (
    <div className="space-y-3">
      {overall.map((b) => (
        <BudgetCard key={b.id} progress={budgetProgress(b, transactions, now)} onEdit={() => openExisting(b)} place="settings" />
      ))}

      {overallMissing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {overallMissing.map((p) => (
            <Button key={p} variant="secondary" size="sm" onClick={() => openNew(undefined, p)}>
              + {SET_LABEL[p]}
            </Button>
          ))}
        </div>
      )}

      {categoryBudgets.map((b) => (
        <BudgetCard
          key={b.id}
          progress={budgetProgress(b, transactions, now)}
          category={categories.find((c) => c.id === b.categoryId)}
          onEdit={() => openExisting(b)}
          place="settings"
        />
      ))}

      {categoriesWithFreePeriod.length > 0 && (
        <details className="rounded-xl border border-dashed border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <summary className="cursor-pointer font-medium text-neutral-600 dark:text-neutral-300">
            {t.budgets.addCategoryBudget}
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categoriesWithFreePeriod.map((c) => (
              <button
                key={c.id}
                onClick={() => openNew(c.id)}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs dark:border-neutral-800"
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </details>
      )}

      <BudgetFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        categoryId={editing.categoryId}
        period={editing.period}
        unavailablePeriods={editing.budget ? [] : takenPeriods(editing.categoryId)}
        categories={categories}
        existing={editing.budget}
        onSubmit={(amount, categoryId, period) => {
          upsertBudget({ amount, categoryId, period }, editing.budget?.id);
          showToast({ message: t.toasts.budgetSaved });
        }}
        onDelete={
          editing.budget
            ? () => {
                removeBudget(editing.budget!.id);
                showToast({ message: t.toasts.budgetRemoved });
              }
            : undefined
        }
      />
    </div>
  );
}
