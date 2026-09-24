import { useMemo, useState, type ReactNode } from "react";
import type { Transaction, TransactionType } from "../../types";
import {
  TransactionSheetActionsContext,
  TransactionSheetStateContext,
  type SheetState,
  type TransactionSheetActions,
} from "./transactionSheetStore";

export function TransactionSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>({ open: false, transaction: null, initialType: "expense" });

  // setState is stable, so the actions object is created once.
  const actions: TransactionSheetActions = useMemo(
    () => ({
      openAdd: (type: TransactionType = "expense") => setState({ open: true, transaction: null, initialType: type }),
      openEdit: (transaction: Transaction) => setState({ open: true, transaction, initialType: transaction.type }),
      close: () => setState((s) => ({ ...s, open: false })),
    }),
    []
  );

  return (
    <TransactionSheetActionsContext.Provider value={actions}>
      <TransactionSheetStateContext.Provider value={state}>{children}</TransactionSheetStateContext.Provider>
    </TransactionSheetActionsContext.Provider>
  );
}
