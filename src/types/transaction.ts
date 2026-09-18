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
  createdAt: string;
  updatedAt: string;
}

export type NewTransactionInput = Pick<
  Transaction,
  "type" | "amount" | "categoryId" | "date"
>;
