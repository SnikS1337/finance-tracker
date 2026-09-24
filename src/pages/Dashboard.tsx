import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../hooks/useAppData";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { QuickStats } from "../components/dashboard/QuickStats";
import { SpendingChart, CategoryDonut } from "../components/dashboard/LazyCharts";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useTransactionSheet } from "../hooks/useTransactionSheet";
import { summarize } from "../lib/calculations";
import { buildSpendingSeriesFromDaily } from "../lib/chart-data";
import { getPresetRange } from "../lib/date-utils";
import { t } from "../i18n";

/**
 * The dashboard is a fixed "this month" overview. Choosing other periods lives
 * in Analytics, which has the full PeriodSelector.
 */
export default function Dashboard() {
  const { transactions, categories } = useAppData();
  const { openAdd } = useTransactionSheet();
  const navigate = useNavigate();

  // Same lifetime as the old `usePeriod("thisMonth")` range: computed once per visit.
  const range = useMemo(() => getPresetRange("thisMonth"), []);

  const { summary, series } = useMemo(() => {
    const summary = summarize(transactions, range);
    return { summary, series: buildSpendingSeriesFromDaily(summary.dailyExpenses) };
  }, [transactions, range]);

  if (transactions.length === 0) {
    return (
      <div className="pt-10">
        <EmptyState
          title={t.dashboard.emptyTitle}
          description={t.dashboard.emptyDescription}
          action={<Button onClick={() => openAdd()}>{t.dashboard.addTransactionCta}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.dashboard.title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.dashboard.periodCaption}</p>
      </div>

      <SummaryCards income={summary.income} expenses={summary.expenses} balance={summary.balance} />

      <QuickStats
        averagePerDay={summary.averagePerDay}
        medianPerDay={summary.medianPerDay}
        transactionCount={summary.transactionCount}
        spendingDays={summary.spendingDays}
      />

      <SpendingChart data={series} />

      <CategoryDonut
        title={t.categoryBreakdown.spendingByCategory}
        totals={summary.expenseByCategory}
        categories={categories}
        emptyMessage={t.categoryBreakdown.expenseEmptyHint}
        onSelectCategory={(categoryId) => navigate(`/transactions?category=${categoryId}`)}
      />
    </div>
  );
}
