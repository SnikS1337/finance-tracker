import { useCallback, useState } from "react";
import type { Budget, NewBudgetInput } from "../types";
import * as storage from "../lib/storage";
import { newId } from "../lib/id";
import { sameBudgetSlot } from "../lib/budgets";

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>(() => storage.getBudgets());

  const refresh = useCallback(() => setBudgets(storage.getBudgets()), []);

  const upsertBudget = useCallback(
    (input: NewBudgetInput, existingId?: string) => {
      const now = new Date().toISOString();
      if (existingId) {
        storage.updateBudget(existingId, input);
      } else {
        // One budget per scope (overall or a category) and period — replace rather than duplicate.
        const all = storage.getBudgets();
        const dupe = all.find((b) => sameBudgetSlot(b, input));
        if (dupe) {
          storage.updateBudget(dupe.id, input);
        } else {
          storage.createBudget({ id: newId(), ...input, createdAt: now, updatedAt: now });
        }
      }
      refresh();
    },
    [refresh]
  );

  const removeBudget = useCallback((id: string) => {
    storage.deleteBudget(id);
    refresh();
  }, [refresh]);

  return { budgets, upsertBudget, removeBudget, refresh };
}
