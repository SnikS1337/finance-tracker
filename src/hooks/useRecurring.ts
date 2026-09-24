import { useCallback, useState } from "react";
import type { RecurringRule } from "../types";
import * as storage from "../lib/storage";

export function useRecurring() {
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(() => storage.getRecurringRules());

  const refresh = useCallback(() => setRecurringRules(storage.getRecurringRules()), []);

  const addRecurringRule = useCallback(
    (rule: RecurringRule) => {
      storage.createRecurringRule(rule);
      refresh();
    },
    [refresh]
  );

  /** Stops a repeating operation. Operations it already added stay. */
  const removeRecurringRule = useCallback(
    (id: string) => {
      storage.deleteRecurringRule(id);
      refresh();
    },
    [refresh]
  );

  return { recurringRules, addRecurringRule, removeRecurringRule, refresh };
}
