import type { TransactionType } from "./transaction";

/**
 * A monthly repeating operation (rent, salary, subscriptions). Occurrences are
 * added as ordinary transactions (with `recurringId`) once their date arrives.
 */
export interface RecurringRule {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note?: string;
  /** Day of the month, 1–31; clamped to shorter months (31 → 30 Apr, 28/29 Feb). */
  dayOfMonth: number;
  /** "yyyy-MM-dd" of the first occurrence. */
  startDate: string;
  /** "yyyy-MM-dd" of the latest occurrence already added. */
  lastDate: string;
  createdAt: string;
}
