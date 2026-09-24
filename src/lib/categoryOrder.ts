import type { Category, Transaction } from "../types";

/**
 * Categories in the order people most likely want them in the form: the one
 * used for the most recent operation first, then by how often each was used,
 * then the original order (so unused categories keep their familiar order).
 */
export function orderCategoriesByUsage(categories: Category[], transactions: Transaction[]): Category[] {
  const counts = new Map<string, number>();
  let lastUsedId: string | null = null;
  let lastCreatedAt = "";
  for (const tx of transactions) {
    counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
    if (tx.createdAt > lastCreatedAt) {
      lastCreatedAt = tx.createdAt;
      lastUsedId = tx.categoryId;
    }
  }
  const originalIndex = new Map(categories.map((c, i) => [c.id, i]));
  return categories.slice().sort((a, b) => {
    if (a.id === lastUsedId) return -1;
    if (b.id === lastUsedId) return 1;
    const byCount = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
    return byCount !== 0 ? byCount : originalIndex.get(a.id)! - originalIndex.get(b.id)!;
  });
}
