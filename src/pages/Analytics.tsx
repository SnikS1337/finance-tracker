import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../hooks/useAppData";
import { periodSearch, useUrlPeriod } from "../hooks/usePeriod";
import { PeriodSelector } from "../components/period/PeriodSelector";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { QuickStats } from "../components/dashboard/QuickStats";
import { SpendingChart, CategoryDonut } from "../components/dashboard/LazyCharts";
import { DayHighlightCards } from "../components/analytics/DayHighlightCards";
import { PeriodComparison } from "../components/analytics/PeriodComparison";
import { EmptyState } from "../components/ui/EmptyState";
import { getComparisonRanges, formatRangeLabel } from "../lib/date-utils";
import { summarize, calculateTotalExpenses, calculatePercentageChange } from "../lib/calculations";
import { buildSpendingSeriesFromDaily } from "../lib/chart-data";
import { canAnimate, EASE_CALM_OUT } from "../lib/motion";
import { t } from "../i18n";

export default function Analytics() {
  const { transactions, categories } = useAppData();
  const period = useUrlPeriod("thisMonth");
  const navigate = useNavigate();

  const { range } = period;

  // Depends on the memoized `range`, not the `period` object (a new object every
  // render), so the full analytics recalculation only runs when inputs change.
  const data = useMemo(() => {
    const summary = summarize(transactions, range);
    // Compare only what has actually happened: "1–24 Sep" vs "1–24 Aug", not a
    // partial month against a full one.
    const comparison = getComparisonRanges(range);
    const comparisonData = comparison && {
      ...comparison,
      currentExpenses: calculateTotalExpenses(transactions, comparison.current),
      previousExpenses: calculateTotalExpenses(transactions, comparison.previous),
    };
    return {
      summary,
      series: buildSpendingSeriesFromDaily(summary.dailyExpenses),
      comparison: comparisonData
        ? {
            ...comparisonData,
            percentageChange: calculatePercentageChange(comparisonData.currentExpenses, comparisonData.previousExpenses),
          }
        : null,
    };
  }, [transactions, range]);
  const { summary, comparison } = data;

  // Switching the period softly fades the results in instead of snapping
  // (numbers glide on their own, see AnimatedNumber). Not on the first render.
  const resultsRef = useRef<HTMLDivElement>(null);
  const rangeKey = `${range.start.getTime()}_${range.end.getTime()}`;
  const previousRangeKey = useRef(rangeKey);
  useEffect(() => {
    if (previousRangeKey.current === rangeKey) return;
    previousRangeKey.current = rangeKey;
    const el = resultsRef.current;
    if (!canAnimate(el)) return;
    el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 280, easing: EASE_CALM_OUT });
  }, [rangeKey]);

  // Opening a category keeps the period you were looking at.
  const openCategory = (categoryId: string) => {
    const extra = periodSearch(period);
    navigate(`/transactions?category=${categoryId}${extra ? `&${extra}` : ""}`);
  };

  if (transactions.length === 0) {
    return (
      <div className="pt-10">
        <EmptyState title={t.analytics.emptyTitle} description={t.analytics.emptyDescription} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t.analytics.title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.analytics.subtitle}</p>
      </div>

      <PeriodSelector
        value={period.preset}
        onChange={period.setPreset}
        customStart={period.customStart}
        customEnd={period.customEnd}
        onCustomChange={period.setCustomRange}
      />

      <div ref={resultsRef} className="space-y-6">
        <SummaryCards income={summary.income} expenses={summary.expenses} balance={summary.balance} />
        <QuickStats
          averagePerDay={summary.averagePerDay}
          medianPerDay={summary.medianPerDay}
          transactionCount={summary.transactionCount}
          spendingDays={summary.spendingDays}
        />
        <DayHighlightCards highest={summary.highest} lowest={summary.lowest} />

        {comparison && (
          <PeriodComparison
            currentLabel={formatRangeLabel(comparison.current)}
            previousLabel={formatRangeLabel(comparison.previous)}
            current={comparison.currentExpenses}
            previous={comparison.previousExpenses}
            percentageChange={comparison.percentageChange}
          />
        )}

        <SpendingChart data={data.series} />

        <CategoryDonut
          title={t.categoryBreakdown.spendingByCategory}
          totals={summary.expenseByCategory}
          categories={categories}
          emptyMessage={t.categoryBreakdown.expenseEmptyHint}
          onSelectCategory={openCategory}
        />
        <CategoryDonut
          title={t.categoryBreakdown.incomeByCategory}
          totals={summary.incomeByCategory}
          categories={categories}
          emptyMessage={t.categoryBreakdown.incomeEmptyHint}
          onSelectCategory={openCategory}
        />
      </div>
    </div>
  );
}
