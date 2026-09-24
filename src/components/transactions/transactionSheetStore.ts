import { createContext, type Context } from "react";
import type { Transaction, TransactionType } from "../../types";

export interface SheetState {
  open: boolean;
  transaction: Transaction | null;
  initialType: TransactionType;
}

export interface TransactionSheetActions {
  openAdd: (type?: TransactionType) => void;
  openEdit: (transaction: Transaction) => void;
  close: () => void;
}

export interface TransactionSheetContextValue extends TransactionSheetActions {
  state: SheetState;
}

/**
 * Two contexts on purpose: pages only need the (stable) actions to open the
 * sheet. If they subscribed to the sheet state too, opening the sheet would
 * re-render the whole current page (e.g. every row of a long transaction list)
 * right as the sheet animation starts.
 */
export const TransactionSheetStateContext: Context<SheetState | null> = createContext<SheetState | null>(null);
export const TransactionSheetActionsContext: Context<TransactionSheetActions | null> =
  createContext<TransactionSheetActions | null>(null);
