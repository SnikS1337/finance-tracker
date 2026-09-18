import { cn } from "../../lib/cn";
import type { BudgetStatus } from "../../types";

const statusColor: Record<BudgetStatus, string> = {
  normal: "bg-emerald-500",
  approaching: "bg-amber-500",
  exceeded: "bg-red-500",
};

export function ProgressBar({ percentage, status }: { percentage: number; status: BudgetStatus }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
    >
      <div
        // Animating `transform: scaleX()` instead of `width` avoids triggering layout
        // (reflow) on every update — the browser only has to composite, not re-layout.
        className={cn("h-full w-full origin-left rounded-full transition-transform duration-500 ease-calm-out", statusColor[status])}
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}
