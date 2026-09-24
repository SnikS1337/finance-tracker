import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { FitText } from "../ui/FitText";
import { formatCurrency } from "../../lib/currency";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  currentLabel: string;
  previousLabel: string;
  current: number;
  previous: number;
  percentageChange: number | null;
}

/**
 * One row per figure (label left, amount right) rather than three narrow
 * columns: long amounts get most of the width and shrink to fit if needed.
 */
function Row({ label, children, emphasis }: { label: ReactNode; children: ReactNode; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <FitText className={cn("max-w-[65%] shrink-0 text-right tabular-nums", emphasis ? "font-semibold" : "font-medium")}>
        {children}
      </FitText>
    </div>
  );
}

export function PeriodComparison({ currentLabel, previousLabel, current, previous, percentageChange }: Props) {
  const diff = current - previous;
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{t.analytics.comparedToPrevious}</h3>
      <div className="space-y-2 text-sm">
        <Row label={currentLabel}>{formatCurrency(current)}</Row>
        <Row label={previousLabel}>{formatCurrency(previous)}</Row>
        <div className="border-t border-neutral-100 pt-2 dark:border-neutral-800">
          <Row
            emphasis
            label={
              <>
                {t.analytics.difference}
                {percentageChange !== null && (
                  <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">
                    {percentageChange >= 0 ? "+" : ""}
                    {percentageChange.toFixed(1)}%
                  </span>
                )}
              </>
            }
          >
            {diff > 0 ? "+" : ""}
            {formatCurrency(diff)}
          </Row>
        </div>
      </div>
    </Card>
  );
}
