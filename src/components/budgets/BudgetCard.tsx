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
    <Card className="cursor-pointer" onClick={onEdit}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {category ? (
            <>
              <span>{category.icon}</span>
              {category.name}
            </>
          ) : (
            t.budgets.monthlyBudget
          )}
        </span>
        <span
          className={
            status === "exceeded"
              ? "text-xs font-semibold text-red-600 dark:text-red-400"
              : status === "approaching"
                ? "text-xs font-semibold text-amber-600 dark:text-amber-400"
                : "text-xs font-medium text-neutral-500 dark:text-neutral-400"
          }
        >
          {Math.round(percentage)}%
        </span>
      </div>
      <ProgressBar percentage={percentage} status={status} />
      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {t.budgets.spent} {formatCurrency(spent)}
        </span>
        <span>
          {t.budgets.of} {formatCurrency(budget.amount)}
        </span>
      </div>
    </Card>
  );
}
