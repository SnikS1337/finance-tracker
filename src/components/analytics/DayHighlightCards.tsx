import { Card } from "../ui/Card";
import { formatCurrency } from "../../lib/currency";
import { fromDateKey } from "../../lib/date-utils";
import { format } from "date-fns";
import type { DaySpend } from "../../lib/calculations";
import { t, dateLocale } from "../../i18n";

export function DayHighlightCards({ highest, lowest }: { highest: DaySpend | null; lowest: DaySpend | null }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
      <Card className="!p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.analytics.highestSpendingDay}</p>
        {highest ? (
          <>
            <p className="mt-1 text-base font-semibold tabular-nums">{formatCurrency(highest.total)}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {format(fromDateKey(highest.date), "d MMM yyyy", { locale: dateLocale })}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-neutral-400">—</p>
        )}
      </Card>
      <Card className="!p-3.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t.analytics.lowestSpendingDay}</p>
        {lowest ? (
          <>
            <p className="mt-1 text-base font-semibold tabular-nums">{formatCurrency(lowest.total)}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {format(fromDateKey(lowest.date), "d MMM yyyy", { locale: dateLocale })}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-neutral-400">—</p>
        )}
      </Card>
    </div>
  );
}
