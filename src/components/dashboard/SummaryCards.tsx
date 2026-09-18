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
    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-3">
      <Card className="min-w-0 !p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.income}</p>
        <p className="mt-1 break-words text-base font-semibold leading-tight tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-lg md:text-xl">
          {formatCurrency(income)}
        </p>
      </Card>
      <Card className="min-w-0 !p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.expenses}</p>
        <p className="mt-1 break-words text-base font-semibold leading-tight tracking-tight sm:text-lg md:text-xl">
          {formatCurrency(expenses)}
        </p>
      </Card>
      <Card className="min-w-0 !p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.balance}</p>
        <p
          className={cn(
            "mt-1 break-words text-base font-semibold leading-tight tracking-tight sm:text-lg md:text-xl",
            balance < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"
          )}
        >
          {formatCurrency(balance)}
        </p>
      </Card>
    </div>
  );
}
