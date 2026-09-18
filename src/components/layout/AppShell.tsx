import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TransactionFormSheet } from "../transactions/TransactionFormSheet";
import { useTransactionSheet } from "../../hooks/useTransactionSheet";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { t } from "../../i18n";

export function AppShell() {
  const { state, openAdd, close, setMode } = useTransactionSheet();
  const { categories, addTransaction, editTransaction, removeTransaction, undoDelete } = useAppData();
  const { showToast } = useToast();

  return (
    <div className="min-h-screen md:pl-60">
      <Sidebar onAdd={() => openAdd()} />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:max-w-3xl md:px-8 md:pb-10">
        <Outlet />
      </main>
      <BottomNav onAdd={() => openAdd()} />

      <TransactionFormSheet
        open={state.open}
        onOpenChange={(open) => !open && close()}
        categories={categories}
        transaction={state.transaction}
        initialType={state.initialType}
        mode={state.mode}
        onExpand={() => setMode("full")}
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
          removeTransaction(id);
          showToast({ message: t.toasts.transactionDeleted, actionLabel: t.toasts.undo, onAction: undoDelete });
        }}
      />
    </div>
  );
}
