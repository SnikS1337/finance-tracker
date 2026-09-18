import { useMemo, useState } from "react";
import { getPresetRange, todayKey, type DateRange, type PeriodPreset } from "../lib/date-utils";

export function usePeriod(initial: PeriodPreset = "thisMonth") {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [customStart, setCustomStart] = useState(todayKey());
  const [customEnd, setCustomEnd] = useState(todayKey());

  const isInvalidCustomRange = preset === "custom" && customStart > customEnd;

  const range: DateRange = useMemo(() => {
    if (isInvalidCustomRange) {
      // Degenerate empty range rather than crashing or silently swapping dates on the user.
      return { start: new Date(NaN), end: new Date(NaN) };
    }
    return getPresetRange(preset, customStart, customEnd);
  }, [preset, customStart, customEnd, isInvalidCustomRange]);

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
