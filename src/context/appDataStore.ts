import { createContext, type Context } from "react";
import type { useTransactions } from "../hooks/useTransactions";
import type { useCategories } from "../hooks/useCategories";
import type { useBudgets } from "../hooks/useBudgets";
import type { useSettings } from "../hooks/useSettings";
import type { useRecurring } from "../hooks/useRecurring";

export type AppData = ReturnType<typeof useTransactions> &
  ReturnType<typeof useCategories> &
  ReturnType<typeof useBudgets> &
  ReturnType<typeof useSettings> &
  Omit<ReturnType<typeof useRecurring>, "refresh"> & { refresh: () => void };

export const AppDataContext: Context<AppData | null> = createContext<AppData | null>(null);
