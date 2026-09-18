import { createContext, type Context } from "react";
import type { useTransactions } from "../hooks/useTransactions";
import type { useCategories } from "../hooks/useCategories";
import type { useBudgets } from "../hooks/useBudgets";
import type { useSettings } from "../hooks/useSettings";

export type AppData = ReturnType<typeof useTransactions> &
  ReturnType<typeof useCategories> &
  ReturnType<typeof useBudgets> &
  ReturnType<typeof useSettings> & { refresh: () => void };

export const AppDataContext: Context<AppData | null> = createContext<AppData | null>(null);
