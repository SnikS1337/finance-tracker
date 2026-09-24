import { useContext } from "react";
import {
  TransactionSheetActionsContext,
  TransactionSheetStateContext,
  type TransactionSheetActions,
  type TransactionSheetContextValue,
} from "../components/transactions/transactionSheetStore";

/** Open/close the transaction sheet. Doesn't re-render when the sheet opens or closes. */
export function useTransactionSheetActions(): TransactionSheetActions {
  const actions = useContext(TransactionSheetActionsContext);
  if (!actions) throw new Error("useTransactionSheetActions must be used within TransactionSheetProvider");
  return actions;
}

/** Actions plus the sheet's current state — only for the component that renders the sheet. */
export function useTransactionSheet(): TransactionSheetContextValue {
  const actions = useTransactionSheetActions();
  const state = useContext(TransactionSheetStateContext);
  if (!state) throw new Error("useTransactionSheet must be used within TransactionSheetProvider");
  return { ...actions, state };
}
