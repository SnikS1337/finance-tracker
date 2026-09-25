import { useEffect, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { formatAmountInput, parseAmountInput } from "../../lib/currency";
import { BUDGET_PERIODS, budgetPeriod } from "../../lib/budgets";
import { cn } from "../../lib/cn";
import type { Budget, BudgetPeriod, Category } from "../../types";
import { t } from "../../i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = an overall budget; a category = that category's budget. */
  categoryId?: string;
  /** Period preselected for a new budget. */
  period?: BudgetPeriod;
  /** Periods this scope already has a budget for (a new budget can't take them). */
  unavailablePeriods?: BudgetPeriod[];
  categories: Category[];
  existing?: Budget | null;
  onSubmit: (amount: number, categoryId: string | undefined, period: BudgetPeriod) => void;
  onDelete?: () => void;
}

const PERIOD_LABEL: Record<BudgetPeriod, string> = { month: t.budgets.periodMonth, week: t.budgets.periodWeek };

export function BudgetFormSheet({
  open,
  onOpenChange,
  categoryId,
  period = "month",
  unavailablePeriods = [],
  categories,
  existing,
  onSubmit,
  onDelete,
}: Props) {
  const [amountRaw, setAmountRaw] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(categoryId);
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>(period);

  // Resets the form to match whatever is being opened (blank for "new", populated
  // for editing an existing budget). Deliberate: synchronizes local form state with
  // the `existing`/`categoryId` props whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect
    setAmountRaw(existing ? String(existing.amount) : "");
    setSelectedCategoryId(existing?.categoryId ?? categoryId);
    setSelectedPeriod(existing ? budgetPeriod(existing) : period);
  }, [open, existing, categoryId, period]);

  const category = categories.find((c) => c.id === selectedCategoryId);
  const title = category
    ? t.budgets.categoryBudgetTitle(category.name)
    : selectedPeriod === "week"
      ? t.budgets.weeklyBudget
      : t.budgets.monthlyBudget;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-4">
        {/* The period of an existing budget is fixed; a new one picks month or week. */}
        {!existing && (
          <div role="radiogroup" aria-label={t.budgets.periodLabel} className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {BUDGET_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={selectedPeriod === p}
                disabled={unavailablePeriods.includes(p)}
                title={unavailablePeriods.includes(p) ? t.budgets.periodTaken : undefined}
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
                  selectedPeriod === p
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        )}
        <div>
          <label htmlFor="budget-amount" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.budgets.amountLabel(selectedPeriod)}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-3 focus-within:border-neutral-900 dark:border-neutral-800 dark:focus-within:border-white">
            <input
              id="budget-amount"
              inputMode="numeric"
              value={formatAmountInput(amountRaw)}
              onChange={(e) => setAmountRaw(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-xl font-semibold tabular-nums outline-none"
            />
            <span className="text-xl font-semibold text-neutral-400">₫</span>
          </div>
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={() => { onDelete(); onOpenChange(false); }}>
              {t.budgets.removeCta}
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={parseAmountInput(amountRaw) <= 0}
            onClick={() => {
              onSubmit(parseAmountInput(amountRaw), selectedCategoryId, selectedPeriod);
              onOpenChange(false);
            }}
          >
            {t.budgets.saveBudget}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
