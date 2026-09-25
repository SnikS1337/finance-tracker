import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../hooks/useAppData";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { QuickStats } from "../components/dashboard/QuickStats";
import { BudgetOverview } from "../components/dashboard/BudgetOverview";
import { MonthlyReviewCard } from "../components/dashboard/MonthlyReviewCard";
import { monthlyReview } from "../lib/monthlyReview";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useTransactionSheetActions } from "../hooks/useTransactionSheet";
import { useToday } from "../hooks/useToday";
import { summarize } from "../lib/calculations";
import { formatCurrency } from "../lib/currency";
import { fromDateKey, getPresetRange } from "../lib/date-utils";
import { t } from "../i18n";

/**
 * The dashboard is a fixed "this month" overview. Choosing other periods lives
 * in Analytics, which has the full PeriodSelector.
 */
/** Sections appear one after another only the first time the app opens, not on every tab switch. */
let staggerPlayed = false;

export default function Dashboard() {
  const [stagger] = useState(() => !staggerPlayed);
  useEffect(() => {
    staggerPlayed = true;
  }, []);
  const { transactions, categories, budgets } = useAppData();
  const { openAdd } = useTransactionSheetActions();

  // Recomputed when the day changes, so the dashboard rolls over to a new
  // month at midnight even if the app stays open.
  const today = useToday();
  const now = useMemo(() => fromDateKey(today), [today]);
  const range = useMemo(() => getPresetRange("thisMonth", undefined, undefined, now), [now]);

  const summary = useMemo(() => summarize(transactions, range), [transactions, range]);

  // "Итоги августа" on the first days of the month.
  const review = useMemo(() => monthlyReview(transactions, now), [transactions, now]);

  const spentToday = summary.dailyExpenses.get(today) ?? 0;

  if (transactions.length === 0) {
    return (
      // Same page title as with data, so every tab reads the same way.
      <div className="space-y-5">
        <h1 className="text-xl font-semibold">{t.dashboard.title}</h1>
        <EmptyState
          title={t.dashboard.emptyTitle}
          description={t.dashboard.emptyDescription}
          action={<Button onClick={() => openAdd()}>{t.dashboard.addTransactionCta}</Button>}
        />
      </div>
    );
  }

  return (
    // `stagger`: sections appear one after another (index.css), first open only.
    <div className={stagger ? "stagger space-y-5" : "space-y-5"}>
      <div>
        <h1 className="text-xl font-semibold">{t.dashboard.title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.dashboard.periodCaption}</p>
        <p className="mt-1 text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
          {spentToday > 0 ? t.dashboard.todaySpent(formatCurrency(spentToday)) : t.dashboard.todayNothingSpent}
        </p>
      </div>

      {review && <MonthlyReviewCard key={review.monthKey} review={review} categories={categories} />}

      <SummaryCards income={summary.income} expenses={summary.expenses} balance={summary.balance} />

      <BudgetOverview budgets={budgets} categories={categories} transactions={transactions} now={now} />

      <QuickStats
        averagePerDay={summary.averagePerDay}
        medianPerDay={summary.medianPerDay}
        transactionCount={summary.transactionCount}
        spendingDays={summary.spendingDays}
      />

      {/* Charts by time and by category live in Analytics only. */}
    </div>
  );
}
