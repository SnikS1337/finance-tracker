import { useCallback, useRef, useState } from "react";
import type { Transaction, NewTransactionInput } from "../types";
import * as storage from "../lib/storage";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());
  // Holds the most recently deleted transaction so the toast's "Undo" can restore it.
  const lastDeleted = useRef<Transaction | null>(null);

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
      const found = transactions.find((t) => t.id === id) ?? null;
      lastDeleted.current = found;
      storage.deleteTransaction(id);
      refresh();
    },
    [transactions, refresh]
  );

  const undoDelete = useCallback(() => {
    const tx = lastDeleted.current;
    if (!tx) return;
    storage.createTransaction(tx);
    lastDeleted.current = null;
    refresh();
  }, [refresh]);

  const reassignCategory = useCallback(
    (fromCategoryId: string, toCategoryId: string) => {
      const all = storage.getTransactions();
      const next = all.map((t) => (t.categoryId === fromCategoryId ? { ...t, categoryId: toCategoryId } : t));
      storage.saveTransactions(next);
      refresh();
    },
    [refresh]
  );

  return { transactions, addTransaction, editTransaction, removeTransaction, undoDelete, reassignCategory, refresh };
}
