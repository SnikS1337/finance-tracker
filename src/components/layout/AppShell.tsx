import { Suspense, useLayoutEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TransactionFormSheet } from "../transactions/TransactionFormSheet";
import { useTransactionSheet } from "../../hooks/useTransactionSheet";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { ChunkErrorBoundary } from "../ui/ChunkErrorBoundary";
import { PageFallback } from "../ui/PageFallback";
import { useToday } from "../../hooks/useToday";
import { orderCategoriesByUsage } from "../../lib/categoryOrder";
import { findBudgetCrossing } from "../../lib/budgetAlerts";
import { fromDateKey, getPresetRange } from "../../lib/date-utils";
import type { Transaction } from "../../types";
import { t } from "../../i18n";

export function AppShell() {
  const { state, openAdd, close } = useTransactionSheet();
  const { transactions, categories, budgets, addTransaction, editTransaction, removeTransaction, restoreTransaction } =
    useAppData();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const today = useToday();
  const monthRange = useMemo(() => getPresetRange("thisMonth", undefined, undefined, fromDateKey(today)), [today]);

  // Most recently used category first, then by frequency — the one you want is
  // usually in the first row.
  const orderedCategories = useMemo(() => orderCategoriesByUsage(categories, transactions), [categories, transactions]);

  /** " · Бюджет «Еда»: 85%" when this change pushed a budget past 80% or 100%. */
  function budgetNote(after: Transaction[]): string {
    const crossing = findBudgetCrossing(budgets, categories, transactions, after, monthRange);
    if (!crossing) return "";
    const label = crossing.category ? t.toasts.categoryBudgetLabel(crossing.category.name) : t.budgets.monthlyBudget;
    return ` · ${t.toasts.budgetUsage(label, crossing.percent)}`;
  }

  // Each tab opens at the top. Without this the window keeps the previous tab's
  // scroll offset (it's one shared document), so switching from a scrolled
  // Transactions list dropped you into the middle of Settings.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen md:pl-60">
      <Sidebar onAdd={() => openAdd()} />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:max-w-3xl md:px-8 md:pb-10">
        {/* Keyed by route: an error on one page (e.g. a chunk that failed to load
            offline) must not stick around after navigating to another page. */}
        <ChunkErrorBoundary key={pathname}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      <BottomNav onAdd={() => openAdd()} />

      <TransactionFormSheet
        open={state.open}
        onOpenChange={(open) => !open && close()}
        categories={orderedCategories}
        transaction={state.transaction}
        initialType={state.initialType}
        onSubmit={(input) => {
          if (state.transaction) {
            const id = state.transaction.id;
            const after = transactions.map((tx) => (tx.id === id ? { ...tx, ...input } : tx));
            const note = budgetNote(after);
            editTransaction(id, input);
            showToast({ message: t.toasts.transactionUpdated + note });
          } else {
            const added = addTransaction(input);
            const note = budgetNote([...transactions, added]);
            showToast({ message: (input.type === "income" ? t.toasts.incomeAdded : t.toasts.expenseAdded) + note });
          }
        }}
        onRepeat={(input) => {
          const added = addTransaction(input);
          showToast({ message: t.toasts.repeatedToday + budgetNote([...transactions, added]) });
        }}
        onDelete={(id) => {
          const toRestore = state.transaction;
          removeTransaction(id);
          showToast({
            message: t.toasts.transactionDeleted,
            actionLabel: t.toasts.undo,
            onAction: () => toRestore && restoreTransaction(toRestore),
          });
        }}
      />
    </div>
  );
}
