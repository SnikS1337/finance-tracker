import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { useBudgets } from "../hooks/useBudgets";
import { useSettings } from "../hooks/useSettings";
import { useRecurring } from "../hooks/useRecurring";
import { useToday } from "../hooks/useToday";
import { useToast } from "../hooks/useToast";
import * as storage from "../lib/storage";
import { todayKey } from "../lib/date-utils";
import { t } from "../i18n";
import { AppDataContext, type AppData } from "./appDataStore";

/** Adds due repeating operations; 0 when nothing was due or storage is unavailable (nothing written then). */
function applyDueRecurring(): number {
  try {
    return storage.applyRecurring(todayKey());
  } catch {
    return 0;
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const transactions = useTransactions();
  const categories = useCategories();
  const budgets = useBudgets();
  const settings = useSettings();
  const recurring = useRecurring();
  const today = useToday();
  const { showToast } = useToast();

  // The hooks' state and callbacks are stable between renders (useState +
  // useCallback); only the wrapper objects they return are new each time.
  // Building the context value from those stable parts keeps it referentially
  // stable until data actually changes, so consumers don't re-render for nothing.
  const {
    transactions: txList,
    addTransaction,
    editTransaction,
    removeTransaction,
    restoreTransaction,
    reassignCategory: reassignTransactions,
  } = transactions;
  const { categories: categoryList, addCategory, editCategory, archiveCategory, unarchiveCategory } = categories;
  const { budgets: budgetList, upsertBudget, removeBudget } = budgets;
  const { settings: currentSettings, updateSettings } = settings;
  const { removeCategory: removeCategoryOnly, refresh: refreshCategories } = categories;
  const { refresh: refreshBudgets } = budgets;
  const { refresh: refreshTransactions } = transactions;
  const { refresh: refreshSettings } = settings;
  const { recurringRules, startRecurring: startRecurringOnly, removeRecurringRule, refresh: refreshRecurring } = recurring;

  // Starting a repeating operation adds its first occurrence (and any months
  // already due) to the transactions too.
  const startRecurring = useCallback(
    (...args: Parameters<typeof startRecurringOnly>) => {
      const caughtUp = startRecurringOnly(...args);
      refreshTransactions();
      return caughtUp;
    },
    [startRecurringOnly, refreshTransactions]
  );

  // Deleting a category also deletes its budget and repeating operations in
  // storage (see storage.deleteCategory), so those slices must be re-read too.
  const removeCategory = useCallback(
    (id: string) => {
      removeCategoryOnly(id);
      refreshBudgets();
      refreshRecurring();
    },
    [removeCategoryOnly, refreshBudgets, refreshRecurring]
  );

  // Moving operations to another category moves repeating operations too.
  const reassignCategory = useCallback(
    (fromId: string, toId: string) => {
      reassignTransactions(fromId, toId);
      refreshRecurring();
    },
    [reassignTransactions, refreshRecurring]
  );

  // Each hook's own `refresh` refreshes only its own slice; imports/deletes touch
  // everything at once, so callers get a combined refresh instead of a single hook's.
  const refresh = useCallback(() => {
    // Imported or replaced data may have repeating operations that are due.
    applyDueRecurring();
    refreshTransactions();
    refreshCategories();
    refreshBudgets();
    refreshSettings();
    refreshRecurring();
  }, [refreshTransactions, refreshCategories, refreshBudgets, refreshSettings, refreshRecurring]);

  // Repeating operations come due on their day: on start and when the date
  // changes while the app is open (months missed while the app wasn't opened
  // are caught up too).
  useEffect(() => {
    const added = applyDueRecurring();
    refreshRecurring();
    if (added > 0) {
      refreshTransactions();
      // Informational: never pushes an "Отменить" toast off the screen.
      showToast({ message: t.toasts.recurringAdded(added), passive: true });
    }
  }, [today, refreshRecurring, refreshTransactions, showToast]);

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
      recurringRules,
      startRecurring,
      removeRecurringRule,
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
      recurringRules,
      startRecurring,
      removeRecurringRule,
      refresh,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
