import { createContext, type Context } from "react";
import type { Transaction, TransactionType } from "../../types";

export interface SheetState {
  open: boolean;
  transaction: Transaction | null;
  initialType: TransactionType;
}

export interface TransactionSheetContextValue {
  state: SheetState;
  openAdd: (type?: TransactionType) => void;
  openEdit: (transaction: Transaction) => void;
  close: () => void;
}

export const TransactionSheetContext: Context<TransactionSheetContextValue | null> =
  createContext<TransactionSheetContextValue | null>(null);
