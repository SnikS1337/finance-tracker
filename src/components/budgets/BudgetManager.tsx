import { useState } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { useToday } from "../../hooks/useToday";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { BudgetCard } from "./BudgetCard";
import { BudgetFormSheet } from "./BudgetFormSheet";
import { BUDGET_PERIODS, budgetPeriod, budgetProgress, byPeriod } from "../../lib/budgets";
import { fromDateKey } from "../../lib/date-utils";
import type { Budget, BudgetPeriod } from "../../types";
import { t } from "../../i18n";

const SET_LABEL: Record<BudgetPeriod, string> = { month: t.budgets.setMonthlyBudget, week: t.budgets.setWeeklyBudget };

/** "+ Бюджет на месяц" / "+ Добавить бюджет по категории": one look, 44px tall. */
const ADD_ROW =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800/60";

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
        <div className={cn("grid gap-2", overallMissing.length > 1 && "grid-cols-2")}>
          {overallMissing.map((p) => (
            <button key={p} type="button" onClick={() => openNew(undefined, p)} className={ADD_ROW}>
              + {SET_LABEL[p]}
            </button>
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
        <details className="group/add">
          {/* Same look as the buttons above; the default ▸ marker is hidden (it
              doubled the "+"), a chevron shows open/closed instead. */}
          <summary className={cn(ADD_ROW, "cursor-pointer list-none justify-between px-3 [&::-webkit-details-marker]:hidden")}>
            <span>{t.budgets.addCategoryBudget}</span>
            <ChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform duration-150 group-open/add:rotate-180" />
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoriesWithFreePeriod.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openNew(c.id)}
                // 36px chip, 44px touch area (the invisible ::after reaches into the 8px gaps).
                className="relative min-h-9 rounded-full border border-neutral-200 px-3 text-sm after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] dark:border-neutral-800"
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
