import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { useBudgets } from "../hooks/useBudgets";
import { useSettings } from "../hooks/useSettings";
import { AppDataContext, type AppData } from "./appDataStore";

export function AppDataProvider({ children }: { children: ReactNode }) {
  const transactions = useTransactions();
  const categories = useCategories();
  const budgets = useBudgets();
  const settings = useSettings();

  // The hooks' state and callbacks are stable between renders (useState +
  // useCallback); only the wrapper objects they return are new each time.
  // Building the context value from those stable parts keeps it referentially
  // stable until data actually changes, so consumers don't re-render for nothing.
  const { transactions: txList, addTransaction, editTransaction, removeTransaction, restoreTransaction, reassignCategory } =
    transactions;
  const { categories: categoryList, addCategory, editCategory, archiveCategory, unarchiveCategory } = categories;
  const { budgets: budgetList, upsertBudget, removeBudget } = budgets;
  const { settings: currentSettings, updateSettings } = settings;
  const { removeCategory: removeCategoryOnly, refresh: refreshCategories } = categories;
  const { refresh: refreshBudgets } = budgets;
  const { refresh: refreshTransactions } = transactions;
  const { refresh: refreshSettings } = settings;

  // Deleting a category also deletes its budget in storage (see
  // storage.deleteCategory), so the budgets slice must be re-read too.
  const removeCategory = useCallback(
    (id: string) => {
      removeCategoryOnly(id);
      refreshBudgets();
    },
    [removeCategoryOnly, refreshBudgets]
  );

  // Each hook's own `refresh` refreshes only its own slice; imports/deletes touch
  // everything at once, so callers get a combined refresh instead of a single hook's.
  const refresh = useCallback(() => {
    refreshTransactions();
    refreshCategories();
    refreshBudgets();
    refreshSettings();
  }, [refreshTransactions, refreshCategories, refreshBudgets, refreshSettings]);

  // Another tab (or the installed app next to a browser tab) changed the data:
  // re-read it, so this tab never shows — or later overwrites — stale data.
  // The `storage` event only fires in the *other* tabs, never in the writer.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const relevant =
        e.key === null || // localStorage.clear() in the other tab
        (e.key.startsWith("pft:") && e.key !== "pft:__test__" && !e.key.startsWith("pft:exchangeRate"));
      if (relevant) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const value: AppData = useMemo(
    () => ({
      transactions: txList,
      addTransaction,
      editTransaction,
      removeTransaction,
      restoreTransaction,
      reassignCategory,
      categories: categoryList,
      addCategory,
      editCategory,
      archiveCategory,
      unarchiveCategory,
      removeCategory,
      budgets: budgetList,
      upsertBudget,
      removeBudget,
      settings: currentSettings,
      updateSettings,
      refresh,
    }),
    [
      txList,
      addTransaction,
      editTransaction,
      removeTransaction,
      restoreTransaction,
      reassignCategory,
      categoryList,
      addCategory,
      editCategory,
      archiveCategory,
      unarchiveCategory,
      removeCategory,
      budgetList,
      upsertBudget,
      removeBudget,
      currentSettings,
      updateSettings,
      refresh,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
