import { useCallback, useState } from "react";
import type { RecurringRule, Transaction } from "../types";
import * as storage from "../lib/storage";
import { todayKey } from "../lib/date-utils";

export function useRecurring() {
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(() => storage.getRecurringRules());

  const refresh = useCallback(() => setRecurringRules(storage.getRecurringRules()), []);

  /**
   * Starts a repeating operation with its first occurrence (written together),
   * then adds any months already due (a start date in the past). Returns how
   * many were caught up. Callers must re-read transactions.
   */
  const startRecurring = useCallback(
    (rule: RecurringRule, first: Transaction): number => {
      storage.createRecurring(rule, first);
      let caughtUp = 0;
      try {
        caughtUp = storage.applyRecurring(todayKey());
      } catch {
        // Storage full: nothing written; the next start or day change retries.
      }
      refresh();
      return caughtUp;
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

  return { recurringRules, startRecurring, removeRecurringRule, refresh };
}
