import { useCallback, useState } from "react";
import type { Transaction, NewTransactionInput } from "../types";
import * as storage from "../lib/storage";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());

  const refresh = useCallback(() => setTransactions(storage.getTransactions()), []);

  const addTransaction = useCallback((input: NewTransactionInput) => {
    const now = new Date().toISOString();
    const tx: Transaction = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
    storage.createTransaction(tx);
    refresh();
    return tx;
  }, [refresh]);

  const editTransaction = useCallback(
    (id: string, patch: Partial<NewTransactionInput>) => {
      storage.updateTransaction(id, patch);
      refresh();
    },
    [refresh]
  );

  const removeTransaction = useCallback(
    (id: string) => {
      storage.deleteTransaction(id);
      refresh();
    },
    [refresh]
  );

  /**
   * Restores an exact, previously-deleted transaction (same id/timestamps),
   * for a toast's "Undo" action. Callers must capture the specific
   * transaction they just deleted and pass it back here directly, rather
   * than relying on a single shared "last deleted" slot: with swipe-to-delete
   * it's easy to delete more than one transaction before dismissing/acting on
   * an earlier toast, and several undo toasts can be visible at once, each
   * needing to restore *its own* transaction, not just whichever was deleted
   * most recently.
   */
  const restoreTransaction = useCallback(
    (tx: Transaction) => {
      storage.createTransaction(tx);
      refresh();
    },
    [refresh]
  );

  const reassignCategory = useCallback(
    (fromCategoryId: string, toCategoryId: string) => {
      const all = storage.getTransactions();
      const next = all.map((t) => (t.categoryId === fromCategoryId ? { ...t, categoryId: toCategoryId } : t));
      storage.saveTransactions(next);
      refresh();
    },
    [refresh]
  );

  return { transactions, addTransaction, editTransaction, removeTransaction, restoreTransaction, reassignCategory, refresh };
}
