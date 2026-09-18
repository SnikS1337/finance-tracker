import { Card } from "../ui/Card";
import { formatCurrency } from "../../lib/currency";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  income: number;
  expenses: number;
  balance: number;
}

export function SummaryCards({ income, expenses, balance }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5 md:gap-3">
      <Card className="!p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.income}</p>
        <p className="mt-1 truncate text-lg font-semibold text-emerald-600 dark:text-emerald-400 md:text-xl">
          {formatCurrency(income)}
        </p>
      </Card>
      <Card className="!p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.expenses}</p>
        <p className="mt-1 truncate text-lg font-semibold md:text-xl">{formatCurrency(expenses)}</p>
      </Card>
      <Card className="!p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.balance}</p>
        <p
          className={cn(
            "mt-1 truncate text-lg font-semibold md:text-xl",
            balance < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"
          )}
        >
          {formatCurrency(balance)}
        </p>
      </Card>
    </div>
  );
}
