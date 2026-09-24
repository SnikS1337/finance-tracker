import { useMemo, useState } from "react";
import { fromDateKey, getPresetRange, todayKey, type DateRange, type PeriodPreset } from "../lib/date-utils";
import { useToday } from "./useToday";

export function usePeriod(initial: PeriodPreset = "thisMonth") {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [customStart, setCustomStart] = useState(todayKey());
  const [customEnd, setCustomEnd] = useState(todayKey());

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
