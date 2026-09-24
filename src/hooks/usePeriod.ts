import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fromDateKey, getPresetRange, todayKey, type DateRange, type PeriodPreset } from "../lib/date-utils";
import { useToday } from "./useToday";

const PRESETS: readonly PeriodPreset[] = [
  "today",
  "yesterday",
  "7d",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "custom",
];

const isPreset = (v: string | null): v is PeriodPreset => v !== null && (PRESETS as readonly string[]).includes(v);
const isDateKey = (v: string | null): v is string => v !== null && !isNaN(fromDateKey(v).getTime());

export interface PeriodState {
  preset: PeriodPreset;
  setPreset: (preset: PeriodPreset) => void;
  customStart: string;
  customEnd: string;
  setCustomRange: (start: string, end: string) => void;
  range: DateRange;
  isInvalidCustomRange: boolean;
}

/** Shared by both hooks: the range for a selection, following the current day. */
function usePeriodRange(preset: PeriodPreset, customStart: string, customEnd: string) {
  // Presets like "Today" / "This month" are relative to the current day, so the
  // range is recomputed when the date changes while the app is open.
  const today = useToday();
  const isInvalidCustomRange = preset === "custom" && customStart > customEnd;
  const range: DateRange = useMemo(() => {
    if (isInvalidCustomRange) {
      // Degenerate empty range rather than crashing or silently swapping dates on the user.
      return { start: new Date(NaN), end: new Date(NaN) };
    }
    return getPresetRange(preset, customStart, customEnd, fromDateKey(today));
  }, [preset, customStart, customEnd, isInvalidCustomRange, today]);
  return { range, isInvalidCustomRange };
}

/** Period selection kept in component state (e.g. the PNG report card). */
export function usePeriod(initial: PeriodPreset = "thisMonth"): PeriodState {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [customStart, setCustomStart] = useState(todayKey());
  const [customEnd, setCustomEnd] = useState(todayKey());
  const { range, isInvalidCustomRange } = usePeriodRange(preset, customStart, customEnd);

  return {
    preset,
    setPreset,
    customStart,
    customEnd,
    setCustomRange: (start: string, end: string) => {
      setCustomStart(start);
      setCustomEnd(end);
    },
    range,
    isInvalidCustomRange,
  };
}

/**
 * Period selection kept in the URL (`?period=lastMonth`, or
 * `?period=custom&from=…&to=…`), so it survives switching tabs and going back,
 * and can be carried along in links. Other query params (e.g. `category`) are
 * preserved. Updates replace the history entry instead of adding one per click.
 */
export function useUrlPeriod(initial: PeriodPreset = "thisMonth"): PeriodState {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPreset = searchParams.get("period");
  const preset = isPreset(rawPreset) ? rawPreset : initial;
  const today = todayKey();
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  const customStart = isDateKey(rawFrom) ? rawFrom : today;
  const customEnd = isDateKey(rawTo) ? rawTo : today;
  const { range, isInvalidCustomRange } = usePeriodRange(preset, customStart, customEnd);

  const update = useCallback(
    (next: { preset: PeriodPreset; from?: string; to?: string }) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.preset === initial) params.delete("period");
          else params.set("period", next.preset);
          if (next.preset === "custom" && next.from && next.to) {
            params.set("from", next.from);
            params.set("to", next.to);
          } else {
            params.delete("from");
            params.delete("to");
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams, initial]
  );

  return {
    preset,
    setPreset: (p) => update({ preset: p, from: customStart, to: customEnd }),
    customStart,
    customEnd,
    setCustomRange: (start, end) => update({ preset: "custom", from: start, to: end }),
    range,
    isInvalidCustomRange,
  };
}

/** Query string that carries a period selection over to another page ("" for the default). */
export function periodSearch(period: Pick<PeriodState, "preset" | "customStart" | "customEnd">, initial: PeriodPreset = "thisMonth"): string {
  if (period.preset === initial) return "";
  const params = new URLSearchParams({ period: period.preset });
  if (period.preset === "custom") {
    params.set("from", period.customStart);
    params.set("to", period.customEnd);
  }
  return params.toString();
}
