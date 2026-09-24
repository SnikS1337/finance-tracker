import type { ReactNode } from "react";
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

  const value: AppData = {
    ...transactions,
    ...categories,
    ...budgets,
    ...settings,
    // Deleting a category also deletes its budget in storage (see
    // storage.deleteCategory), so the budgets slice must be re-read too.
    removeCategory: (id: string) => {
      categories.removeCategory(id);
      budgets.refresh();
    },
    // Each hook's own `refresh` refreshes only its own slice; imports/deletes touch
    // everything at once, so callers get a combined refresh instead of a single hook's.
    refresh: () => {
      transactions.refresh();
      categories.refresh();
      budgets.refresh();
      settings.refresh();
    },
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
