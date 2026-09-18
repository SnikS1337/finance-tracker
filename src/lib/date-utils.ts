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
  eachDayOfInterval,
  isWithinInterval,
  parse,
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

export function fromDateKey(key: string): Date {
  return parse(key, DATE_FORMAT, new Date());
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

export function getPresetRange(preset: PeriodPreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
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

/** The equivalent-length period immediately preceding `range`, for comparisons. */
export function getPreviousRange(range: DateRange): DateRange {
  const days = eachDayOfInterval(range).length;
  const end = subDays(startOfDay(range.start), 1);
  const start = subDays(end, days - 1);
  return { start: startOfDay(start), end: endOfDay(end) };
}

function isValidRange(range: DateRange): boolean {
  return !isNaN(range.start.getTime()) && !isNaN(range.end.getTime()) && range.start <= range.end;
}

export function isDateKeyInRange(dateKey: string, range: DateRange): boolean {
  if (!isValidRange(range)) return false;
  const d = fromDateKey(dateKey);
  return isWithinInterval(d, { start: startOfDay(range.start), end: endOfDay(range.end) });
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
