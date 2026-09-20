import { useState, type ReactNode } from "react";
import { TransactionSheetContext, type SheetState } from "./transactionSheetStore";

export function TransactionSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>({ open: false, transaction: null, initialType: "expense" });

  return (
    <TransactionSheetContext.Provider
      value={{
        state,
        openAdd: (type = "expense") => setState({ open: true, transaction: null, initialType: type }),
        openEdit: (transaction) => setState({ open: true, transaction, initialType: transaction.type }),
        close: () => setState((s) => ({ ...s, open: false })),
      }}
    >
      {children}
    </TransactionSheetContext.Provider>
  );
}
