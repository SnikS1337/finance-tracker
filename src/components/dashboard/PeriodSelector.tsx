import type { PeriodPreset } from "../../lib/date-utils";
import { todayKey } from "../../lib/date-utils";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: t.period.today },
  { value: "7d", label: t.period.last7Days },
  { value: "thisMonth", label: t.period.thisMonth },
  { value: "yesterday", label: t.period.yesterday },
  { value: "lastWeek", label: t.period.lastWeek },
  { value: "lastMonth", label: t.period.lastMonth },
  { value: "thisYear", label: t.period.thisYear },
  { value: "custom", label: t.period.custom },
];

interface Props {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
}

export function PeriodSelector({ value, onChange, customStart, customEnd, onCustomChange }: Props) {
  const invalidRange = value === "custom" && customStart > customEnd;

  return (
    <div className="animate-card-in motion-reduce:animate-none">
      <div className="flex flex-wrap gap-2 pb-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
              value === p.value
                ? "border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-neutral-200 text-neutral-600 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value === "custom" && (
        <div className="mt-3 flex items-end gap-3">
          <label className="flex-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.period.from}
            <input
              type="date"
              value={customStart}
              max={todayKey()}
              onChange={(e) => onCustomChange(e.target.value, customEnd)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm transition-colors focus:border-neutral-900 dark:border-neutral-800 dark:bg-transparent"
            />
          </label>
          <label className="flex-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.period.to}
            <input
              type="date"
              value={customEnd}
              max={todayKey()}
              onChange={(e) => onCustomChange(customStart, e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm transition-colors focus:border-neutral-900 dark:border-neutral-800 dark:bg-transparent"
            />
          </label>
        </div>
      )}
      {invalidRange && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t.period.invalidRange}</p>}
    </div>
  );
}
