import type { Transaction } from "../types";

/**
 * Search in the transactions list. Matches the category name and the note, and — when the
 * query contains digits — the amount, ignoring spaces and separators
 * ("45000", "45 000" and "45 000 ₫" all find 45 000).
 */
export function matchesSearch(tx: Transaction, categoryName: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (categoryName.toLowerCase().includes(q)) return true;
  if (tx.note && tx.note.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  return digits.length > 0 && String(tx.amount).includes(digits);
}
