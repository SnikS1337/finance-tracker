import { createContext, type Context } from "react";
import type { Transaction, TransactionType } from "../../types";

export interface SheetState {
  open: boolean;
  transaction: Transaction | null;
  initialType: TransactionType;
  mode: "quick" | "full";
}

export interface TransactionSheetContextValue {
  state: SheetState;
  openAdd: (type?: TransactionType, mode?: "quick" | "full") => void;
  openEdit: (transaction: Transaction) => void;
  close: () => void;
  setMode: (mode: "quick" | "full") => void;
}

export const TransactionSheetContext: Context<TransactionSheetContextValue | null> =
  createContext<TransactionSheetContextValue | null>(null);
