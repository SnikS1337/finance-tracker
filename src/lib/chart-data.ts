import { format, startOfWeek, startOfMonth } from "date-fns";
import type { Transaction } from "../types";
import { calculateDailyTotals } from "./calculations";
import { fromDateKey, type DateRange } from "./date-utils";
import { dateLocale } from "../i18n";

export interface ChartPoint {
  label: string;
  value: number;
}

/** Buckets daily expense totals into days, weeks, or months depending on the span, so the chart stays readable. */
export function buildSpendingSeries(transactions: Transaction[], range: DateRange): ChartPoint[] {
  return buildSpendingSeriesFromDaily(calculateDailyTotals(transactions, range));
}

/** Same as `buildSpendingSeries`, from already-computed daily totals (e.g. `summarize().dailyExpenses`). */
export function buildSpendingSeriesFromDaily(dailyTotals: Map<string, number>): ChartPoint[] {
  const daily = [...dailyTotals.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (daily.length === 0) return [];

  if (daily.length <= 31) {
    return daily.map(([date, total]) => ({ label: format(fromDateKey(date), "d MMM", { locale: dateLocale }), value: total }));
  }

  const bucketFormatter = daily.length <= 180 ? (d: Date) => startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth;
  const labelFormat = daily.length <= 180 ? "d MMM" : "MMM yyyy";

  const buckets = new Map<string, number>();
  for (const [date, total] of daily) {
    const bucketDate = bucketFormatter(fromDateKey(date));
    const key = format(bucketDate, "yyyy-MM-dd");
    buckets.set(key, (buckets.get(key) ?? 0) + total);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ label: format(fromDateKey(key), labelFormat, { locale: dateLocale }), value }));
}
