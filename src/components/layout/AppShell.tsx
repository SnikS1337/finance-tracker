import { Suspense, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TransactionFormSheet } from "../transactions/TransactionFormSheet";
import { useTransactionSheet } from "../../hooks/useTransactionSheet";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { ChunkErrorBoundary } from "../ui/ChunkErrorBoundary";
import { PageFallback } from "../ui/PageFallback";
import { t } from "../../i18n";

export function AppShell() {
  const { state, openAdd, close } = useTransactionSheet();
  const { categories, addTransaction, editTransaction, removeTransaction, restoreTransaction } = useAppData();
  const { showToast } = useToast();
  const { pathname } = useLocation();

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
        categories={categories}
        transaction={state.transaction}
        initialType={state.initialType}
        onSubmit={(input) => {
          if (state.transaction) {
            editTransaction(state.transaction.id, input);
            showToast({ message: t.toasts.transactionUpdated });
          } else {
            addTransaction(input);
            showToast({ message: input.type === "income" ? t.toasts.incomeAdded : t.toasts.expenseAdded });
          }
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
