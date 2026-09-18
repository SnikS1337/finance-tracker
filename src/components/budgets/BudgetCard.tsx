import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { formatCurrency } from "../../lib/currency";
import type { BudgetProgress, Category } from "../../types";
import { t } from "../../i18n";

interface Props {
  progress: BudgetProgress;
  category?: Category | null;
  onEdit: () => void;
}

export function BudgetCard({ progress, category, onEdit }: Props) {
  const { budget, spent, percentage, status } = progress;
  return (
    <Card className="min-w-0 cursor-pointer" onClick={onEdit}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          {category ? (
            <>
              <span className="shrink-0">{category.icon}</span>
              <span className="min-w-0 break-words">{category.name}</span>
            </>
          ) : (
            <span className="min-w-0 break-words">{t.budgets.monthlyBudget}</span>
          )}
        </span>
        <span
          className={
            status === "exceeded"
              ? "shrink-0 text-xs font-semibold text-red-600 dark:text-red-400"
              : status === "approaching"
                ? "shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400"
                : "shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          }
        >
          {Math.round(percentage)}%
        </span>
      </div>
      <ProgressBar percentage={percentage} status={status} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="min-w-0">{t.budgets.spent} {formatCurrency(spent)}</span>
        <span className="min-w-0">{t.budgets.of} {formatCurrency(budget.amount)}</span>
      </div>
    </Card>
  );
}
