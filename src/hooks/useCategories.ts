import { useCallback, useState } from "react";
import type { Category, NewCategoryInput } from "../types";
import * as storage from "../lib/storage";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(() => storage.getCategories());

  const refresh = useCallback(() => setCategories(storage.getCategories()), []);

  const addCategory = useCallback((input: NewCategoryInput) => {
    const category: Category = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    storage.createCategory(category);
    refresh();
    return category;
  }, [refresh]);

  const editCategory = useCallback(
    (id: string, patch: Partial<Category>) => {
      storage.updateCategory(id, patch);
      refresh();
    },
    [refresh]
  );

  const archiveCategory = useCallback((id: string) => {
    storage.updateCategory(id, { isArchived: true });
    refresh();
  }, [refresh]);

  const unarchiveCategory = useCallback((id: string) => {
    storage.updateCategory(id, { isArchived: false });
    refresh();
  }, [refresh]);

  /** Deletes a category outright. Caller must ensure no transactions reference it. */
  const removeCategory = useCallback((id: string) => {
    storage.deleteCategory(id);
    refresh();
  }, [refresh]);

  return { categories, addCategory, editCategory, archiveCategory, unarchiveCategory, removeCategory, refresh };
}
