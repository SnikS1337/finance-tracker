export type TransactionType = "income" | "expense";

/**
 * A single money movement. Amounts are always stored as positive integers
 * (whole VND, no decimals — VND has no subunit in practice). Sign/meaning
 * comes from `type`, never from the sign of `amount`.
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  /** Positive integer, whole VND. */
  amount: number;
  categoryId: string;
  /** Calendar date the transaction belongs to, "yyyy-MM-dd", no timezone. */
  date: string;
  /** Optional free-text note ("обед с коллегами"). Searchable. */
  note?: string;
  /** Set on operations created by a monthly recurring rule. */
  recurringId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewTransactionInput = Pick<Transaction, "type" | "amount" | "categoryId" | "date"> & {
  note?: string;
  recurringId?: string;
};

/** Longest note the form accepts. */
export const MAX_NOTE_LENGTH = 120;
