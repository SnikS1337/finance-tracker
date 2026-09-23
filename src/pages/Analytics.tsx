import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../hooks/useAppData";
import { usePeriod } from "../hooks/usePeriod";
import { PeriodSelector } from "../components/dashboard/PeriodSelector";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { QuickStats } from "../components/dashboard/QuickStats";
import { SpendingChart, CategoryDonut } from "../components/dashboard/LazyCharts";
import { DayHighlightCards } from "../components/analytics/DayHighlightCards";
import { PeriodComparison } from "../components/analytics/PeriodComparison";
import { EmptyState } from "../components/ui/EmptyState";
import { getPreviousRange, isDateKeyInRange, formatRangeLabel } from "../lib/date-utils";
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateBalance,
  calculateAverageDailyExpense,
  calculateMedianDailyExpense,
  calculateSpendingDaysCount,
  calculateExpenseCategoryTotals,
  calculateIncomeCategoryTotals,
  calculateHighestSpendingDay,
  calculateLowestSpendingDay,
  calculatePercentageChange,
} from "../lib/calculations";
import { buildSpendingSeries } from "../lib/chart-data";
import { t } from "../i18n";

export default function Analytics() {
  const { transactions, categories } = useAppData();
  const period = usePeriod("thisMonth");
  const navigate = useNavigate();

  const { range } = period;
  const isValidRange = !isNaN(range.start.getTime()) && !isNaN(range.end.getTime());

  // Depends on the memoized `range`, not the `period` object (a new object every
  // render), so the full analytics recalculation only runs when inputs change.
  const data = useMemo(() => {
    const previousRange = isValidRange ? getPreviousRange(range) : range;
    const expenses = calculateTotalExpenses(transactions, range);
    const previousExpenses = calculateTotalExpenses(transactions, previousRange);
    return {
      income: calculateTotalIncome(transactions, range),
      expenses,
      balance: calculateBalance(transactions, range),
      avg: calculateAverageDailyExpense(transactions, range),
      median: calculateMedianDailyExpense(transactions, range),
      spendingDays: calculateSpendingDaysCount(transactions, range),
      transactionCount: transactions.filter((tx) => isDateKeyInRange(tx.date, range)).length,
      expenseCategoryTotals: calculateExpenseCategoryTotals(transactions, range),
      incomeCategoryTotals: calculateIncomeCategoryTotals(transactions, range),
      highest: calculateHighestSpendingDay(transactions, range),
      lowest: calculateLowestSpendingDay(transactions, range),
      series: buildSpendingSeries(transactions, range),
      previousExpenses,
      previousRange,
      percentageChange: calculatePercentageChange(expenses, previousExpenses),
    };
  }, [transactions, range, isValidRange]);

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

      <SummaryCards income={data.income} expenses={data.expenses} balance={data.balance} />
      <QuickStats
        averagePerDay={data.avg}
        medianPerDay={data.median}
        transactionCount={data.transactionCount}
        spendingDays={data.spendingDays}
      />
      <DayHighlightCards highest={data.highest} lowest={data.lowest} />

      {isValidRange && (
        <PeriodComparison
          currentLabel={formatRangeLabel(period.range)}
          previousLabel={formatRangeLabel(data.previousRange)}
          current={data.expenses}
          previous={data.previousExpenses}
          percentageChange={data.percentageChange}
        />
      )}

      <SpendingChart data={data.series} />

      <CategoryDonut
        title={t.categoryBreakdown.spendingByCategory}
        totals={data.expenseCategoryTotals}
        categories={categories}
        emptyMessage={t.categoryBreakdown.expenseEmptyHint}
        onSelectCategory={(categoryId) => navigate(`/transactions?category=${categoryId}`)}
      />
      <CategoryDonut
        title={t.categoryBreakdown.incomeByCategory}
        totals={data.incomeCategoryTotals}
        categories={categories}
        emptyMessage={t.categoryBreakdown.incomeEmptyHint}
        onSelectCategory={(categoryId) => navigate(`/transactions?category=${categoryId}`)}
      />
    </div>
  );
}
