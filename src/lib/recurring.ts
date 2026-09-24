import type { RecurringRule, Transaction } from "../types";
import { fromDateKey, toDateKey } from "./date-utils";

/** Safety cap on catch-up: at most this many missed months are added in one go. */
const MAX_CATCH_UP = 120;

/** The rule's date in the given month, clamped to the month's length. */
export function occurrenceIn(year: number, monthIndex: number, dayOfMonth: number): string {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return toDateKey(new Date(year, monthIndex, Math.min(dayOfMonth, lastDay)));
}

/** The occurrence in the month after the one containing `afterKey`. */
export function nextOccurrence(rule: Pick<RecurringRule, "dayOfMonth">, afterKey: string): string {
  const d = fromDateKey(afterKey);
  return occurrenceIn(d.getFullYear(), d.getMonth() + 1, rule.dayOfMonth);
}

/** Dates of occurrences that are due (after `lastDate`, up to and including `today`). */
export function dueOccurrences(rule: RecurringRule, today: string): string[] {
  const dates: string[] = [];
  let next = nextOccurrence(rule, rule.lastDate);
  while (next <= today && dates.length < MAX_CATCH_UP) {
    dates.push(next);
    next = nextOccurrence(rule, next);
  }
  return dates;
}

/**
 * Deterministic id for an occurrence, so generating twice (two open tabs, a
 * repeated run) can never create duplicates.
 */
export const occurrenceId = (ruleId: string, date: string) => `${ruleId}@${date}`;

/**
 * Adds every due occurrence as a transaction and advances each rule's
 * `lastDate`. Pure: returns the new lists and how many operations were added.
 */
export function materializeRecurring(
  rules: RecurringRule[],
  transactions: Transaction[],
  today: string,
  nowIso: string = new Date().toISOString()
): { transactions: Transaction[]; rules: RecurringRule[]; added: number } {
  const existingIds = new Set(transactions.map((tx) => tx.id));
  const created: Transaction[] = [];
  const updatedRules = rules.map((rule) => {
    const due = dueOccurrences(rule, today);
    if (due.length === 0) return rule;
    for (const date of due) {
      const id = occurrenceId(rule.id, date);
      if (existingIds.has(id)) continue;
      existingIds.add(id);
      created.push({
        id,
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        date,
        ...(rule.note ? { note: rule.note } : {}),
        recurringId: rule.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
    return { ...rule, lastDate: due[due.length - 1] };
  });
  return { transactions: created.length ? [...transactions, ...created] : transactions, rules: updatedRules, added: created.length };
}
