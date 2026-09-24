import { ArrowRight } from "lucide-react";
import { Card } from "../ui/Card";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { formatCurrency, formatRubEquivalent } from "../../lib/currency";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  income: number;
  expenses: number;
  balance: number;
}

function RubEquivalent({ amount, rate }: { amount: number; rate: number }) {
  return (
    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
      <ArrowRight size={11} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{formatRubEquivalent(amount, rate)}</span>
    </p>
  );
}

export function SummaryCards({ income, expenses, balance }: Props) {
  const rate = useExchangeRate();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-3 animate-card-in [animation-delay:var(--stagger,0ms)] motion-reduce:animate-none">
      <Card className="min-w-0 !p-3.5 transition-shadow duration-200 hover:shadow-sm">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.income}</p>
        <p className="mt-1 break-words tabular-nums text-base font-semibold leading-tight tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-lg md:text-xl">
          <AnimatedNumber value={income} format={formatCurrency} />
        </p>
        <RubEquivalent amount={income} rate={rate} />
      </Card>
      <Card className="min-w-0 !p-3.5 transition-shadow duration-200 hover:shadow-sm">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.expenses}</p>
        <p className="mt-1 break-words tabular-nums text-base font-semibold leading-tight tracking-tight sm:text-lg md:text-xl">
          <AnimatedNumber value={expenses} format={formatCurrency} />
        </p>
        <RubEquivalent amount={expenses} rate={rate} />
      </Card>
      <Card className="min-w-0 !p-3.5 transition-shadow duration-200 hover:shadow-sm">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.summary.balance}</p>
        <p
          className={cn(
            "mt-1 break-words tabular-nums text-base font-semibold leading-tight tracking-tight sm:text-lg md:text-xl",
            balance < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"
          )}
        >
          <AnimatedNumber value={balance} format={formatCurrency} />
        </p>
        <RubEquivalent amount={balance} rate={rate} />
      </Card>
    </div>
  );
}
