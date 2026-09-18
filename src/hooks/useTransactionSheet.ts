import { useContext } from "react";
import { TransactionSheetContext, type TransactionSheetContextValue } from "../components/transactions/transactionSheetStore";

export function useTransactionSheet(): TransactionSheetContextValue {
  const ctx = useContext(TransactionSheetContext);
  if (!ctx) throw new Error("useTransactionSheet must be used within TransactionSheetProvider");
  return ctx;
}
