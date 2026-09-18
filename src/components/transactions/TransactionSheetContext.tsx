import { useState, type ReactNode } from "react";
import { TransactionSheetContext, type SheetState } from "./transactionSheetStore";

export function TransactionSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>({ open: false, transaction: null, initialType: "expense", mode: "quick" });

  return (
    <TransactionSheetContext.Provider
      value={{
        state,
        openAdd: (type = "expense", mode = "quick") => setState({ open: true, transaction: null, initialType: type, mode }),
        openEdit: (transaction) => setState({ open: true, transaction, initialType: transaction.type, mode: "full" }),
        close: () => setState((s) => ({ ...s, open: false })),
        setMode: (mode) => setState((s) => ({ ...s, mode })),
      }}
    >
      {children}
    </TransactionSheetContext.Provider>
  );
}
