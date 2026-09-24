import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  addDays,
  subMonths,
  subYears,
  eachDayOfInterval,
  differenceInCalendarDays,
} from "date-fns";
import { dateLocale, t } from "../i18n";

export const DATE_FORMAT = "yyyy-MM-dd";

/**
 * All calendar dates in this app are plain "yyyy-MM-dd" strings with no
 * timezone component. We always parse/format them as *local* dates so a
 * transaction dated "2026-09-16" is always the 16th, regardless of the
 * browser's timezone or DST changes.
 */
export function toDateKey(date: Date): string {
  return format(date, DATE_FORMAT);
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a "yyyy-MM-dd" key as a local date. Hand-rolled instead of date-fns
 * `parse`, which drags its whole token-parser table (~17 KB) into the initial
 * bundle for this single fixed format. Same contract: malformed or impossible
 * dates (e.g. "2026-02-30") produce an Invalid Date.
 */
export function fromDateKey(key: string): Date {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return new Date(NaN);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  // new Date() silently rolls over out-of-range parts; reject those like `parse` does.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return new Date(NaN);
  return date;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "7d"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

/** `now` is injectable so presets can follow a changing "today" (see useToday) and be tested. */
export function getPresetRange(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date()
): DateRange {
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "thisWeek":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "lastWeek": {
      const lastWeekDay = subDays(now, 7);
      return {
        start: startOfWeek(lastWeekDay, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeekDay, { weekStartsOn: 1 }),
      };
    }
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth": {
      const lastMonthDay = subDays(startOfMonth(now), 1);
      return { start: startOfMonth(lastMonthDay), end: endOfMonth(lastMonthDay) };
    }
    case "thisYear":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return {
        start: startOfDay(customStart ? fromDateKey(customStart) : now),
        end: endOfDay(customEnd ? fromDateKey(customEnd) : now),
      };
  }
}

function isValidRange(range: DateRange): boolean {
  return !isNaN(range.start.getTime()) && !isNaN(range.end.getTime()) && range.start <= range.end;
}

/**
 * The range as inclusive "yyyy-MM-dd" bounds, or null for an invalid range.
 * Date keys sort lexicographically in calendar order, so membership is a plain
 * string comparison — no Date parsing per transaction.
 */
export function rangeKeys(range: DateRange): { startKey: string; endKey: string } | null {
  if (!isValidRange(range)) return null;
  return { startKey: toDateKey(range.start), endKey: toDateKey(range.end) };
}

export function isDateKeyInRange(dateKey: string, range: DateRange): boolean {
  const keys = rangeKeys(range);
  return keys !== null && dateKey >= keys.startKey && dateKey <= keys.endKey;
}

function isWholeMonth(start: Date, end: Date): boolean {
  return start.getDate() === 1 && toDateKey(end) === toDateKey(endOfMonth(start));
}

function isWholeYear(start: Date, end: Date): boolean {
  return start.getMonth() === 0 && start.getDate() === 1 && toDateKey(end) === toDateKey(endOfYear(start));
}

/**
 * What to compare a period against, taking into account how much of it has
 * actually happened by `now`:
 *
 * - `current` is the elapsed part of `range` (a period that is still running
 *   ends today; a past period is unchanged);
 * - `previous`: for a calendar month or year, the same dates of the previous
 *   month/year ("1–24 Sep" vs "1–24 Aug"), or all of it once the current one
 *   is over; for any other period, the equally long stretch immediately before.
 *
 * Returns null for an invalid range.
 */
export function getComparisonRanges(
  range: DateRange,
  now: Date = new Date()
): { current: DateRange; previous: DateRange } | null {
  if (!isValidRange(range)) return null;
  const start = startOfDay(range.start);
  const fullEnd = startOfDay(range.end);
  const today = startOfDay(now);
  const currentEnd = fullEnd <= today ? fullEnd : today < start ? start : today;
  const days = differenceInCalendarDays(currentEnd, start) + 1;

  let previousStart: Date;
  let previousLimit: Date | null = null;
  if (isWholeMonth(start, fullEnd)) {
    previousStart = startOfMonth(subMonths(start, 1));
    previousLimit = endOfMonth(previousStart);
  } else if (isWholeYear(start, fullEnd)) {
    previousStart = startOfYear(subYears(start, 1));
    previousLimit = endOfYear(previousStart);
  } else {
    previousStart = subDays(start, days);
  }
  let previousEnd = addDays(previousStart, days - 1);
  if (previousLimit) {
    // A finished month/year is compared with the whole previous one (Sep vs all
    // of Aug, even though the day counts differ); a running one with the same
    // dates, never spilling past the previous month's/year's end.
    const finished = toDateKey(currentEnd) === toDateKey(fullEnd);
    if (finished || previousEnd > previousLimit) previousEnd = previousLimit;
  }

  return {
    current: { start, end: endOfDay(currentEnd) },
    previous: { start: startOfDay(previousStart), end: endOfDay(previousEnd) },
  };
}

export function allDateKeysInRange(range: DateRange): string[] {
  if (!isValidRange(range)) return [];
  return eachDayOfInterval({ start: startOfDay(range.start), end: endOfDay(range.end) }).map(toDateKey);
}

export function formatRangeLabel(range: DateRange): string {
  if (isNaN(range.start.getTime()) || isNaN(range.end.getTime())) return t.common.invalidRange;
  return `${format(range.start, "d MMM", { locale: dateLocale })} — ${format(range.end, "d MMM yyyy", { locale: dateLocale })}`;
}

export { addDays, subDays };
