import { Card } from "../ui/Card";
import { formatCurrency } from "../../lib/currency";
import { t } from "../../i18n";

interface Props {
  currentLabel: string;
  previousLabel: string;
  current: number;
  previous: number;
  percentageChange: number | null;
}

export function PeriodComparison({ currentLabel, previousLabel, current, previous, percentageChange }: Props) {
  const diff = current - previous;
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{t.analytics.comparedToPrevious}</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{currentLabel}</p>
          <p className="mt-1 font-semibold">{formatCurrency(current)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{previousLabel}</p>
          <p className="mt-1 font-semibold">{formatCurrency(previous)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.analytics.difference}</p>
          <p className="mt-1 font-semibold">
            {diff >= 0 ? "+" : ""}
            {formatCurrency(diff)}
          </p>
          {percentageChange !== null && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {percentageChange >= 0 ? "+" : ""}
              {percentageChange.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
