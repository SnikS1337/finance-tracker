import { useMemo, useState } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { useToday } from "../../hooks/useToday";
import { Button } from "../ui/Button";
import { BudgetCard } from "./BudgetCard";
import { BudgetFormSheet } from "./BudgetFormSheet";
import { calculateBudgetProgress } from "../../lib/calculations";
import { fromDateKey, getPresetRange } from "../../lib/date-utils";
import type { Budget } from "../../types";
import { t } from "../../i18n";

export function BudgetManager() {
  const { budgets, categories, transactions, upsertBudget, removeBudget } = useAppData();
  const { showToast } = useToast();
  const today = useToday();
  const range = useMemo(() => getPresetRange("thisMonth", undefined, undefined, fromDateKey(today)), [today]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>(undefined);

  const overallBudget = budgets.find((b) => !b.categoryId) ?? null;
  // Budgets of categories that no longer exist (left behind by deletions made
  // before storage.deleteCategory cleaned them up) are hidden, not shown as a
  // second "monthly budget".
  const categoryIds = new Set(categories.map((c) => c.id));
  const categoryBudgets = budgets.filter(
    (b): b is Budget & { categoryId: string } => !!b.categoryId && categoryIds.has(b.categoryId)
  );

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.isArchived);
  const categoriesWithoutBudget = expenseCategories.filter(
    (c) => !categoryBudgets.some((b) => b.categoryId === c.id)
  );

  function openFor(categoryId?: string) {
    setEditingCategoryId(categoryId);
    setFormOpen(true);
  }

  const editingBudget = editingCategoryId
    ? categoryBudgets.find((b) => b.categoryId === editingCategoryId) ?? null
    : overallBudget;

  return (
    <div className="space-y-3">
      {overallBudget ? (
        <BudgetCard progress={calculateBudgetProgress(overallBudget, transactions, range)} onEdit={() => openFor(undefined)} />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => openFor(undefined)}>
          {t.budgets.setMonthlyBudget}
        </Button>
      )}

      {categoryBudgets.map((b) => {
        const category = categories.find((c) => c.id === b.categoryId);
        return (
          <BudgetCard
            key={b.id}
            progress={calculateBudgetProgress(b, transactions, range)}
            category={category}
            onEdit={() => openFor(b.categoryId)}
          />
        );
      })}

      {categoriesWithoutBudget.length > 0 && (
        <details className="rounded-xl border border-dashed border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <summary className="cursor-pointer font-medium text-neutral-600 dark:text-neutral-300">
            {t.budgets.addCategoryBudget}
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categoriesWithoutBudget.map((c) => (
              <button
                key={c.id}
                onClick={() => openFor(c.id)}
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
        categoryId={editingCategoryId}
        categories={categories}
        existing={editingBudget}
        onSubmit={(amount, categoryId) => {
          upsertBudget({ amount, categoryId }, editingBudget?.id);
          showToast({ message: t.toasts.budgetSaved });
        }}
        onDelete={editingBudget ? () => { removeBudget(editingBudget.id); showToast({ message: t.toasts.budgetRemoved }); } : undefined}
      />
    </div>
  );
}
