import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { prefersReducedMotion } from "../../lib/motion";
import type { BudgetStatus } from "../../types";

const statusColor: Record<BudgetStatus, string> = {
  normal: "bg-emerald-500",
  approaching: "bg-amber-500",
  exceeded: "bg-red-500",
};

/**
 * Bars (by `introKey`) that already played their fill-in during this app launch.
 * In memory on purpose: coming back to a screen shows the bar in place, a new
 * launch fills it once again.
 */
const introPlayed = new Set<string>();

type Phase = "empty" | "filling" | "idle";

/**
 * - First show in this launch (with an `introKey`): fills 0 → value (~600 ms).
 * - Afterwards / on return to the screen: drawn in place.
 * - Value changes (an operation added or deleted): glides old → new (~400 ms),
 *   and the colour eases across the 80% / 100% thresholds.
 * - Reduced motion: no animation (plus the global reduced-motion CSS).
 *
 * Only `transform: scaleX()` and colour change, so no layout work per frame.
 */
export function ProgressBar({ percentage, status, introKey }: { percentage: number; status: BudgetStatus; introKey?: string }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const [phase, setPhase] = useState<Phase>(() =>
    introKey !== undefined && !introPlayed.has(introKey) && !prefersReducedMotion() ? "empty" : "idle"
  );

  useEffect(() => {
    if (phase !== "empty") return;
    if (introKey !== undefined) introPlayed.add(introKey);
    // Let the empty bar paint first, then set the real value so the transition runs.
    if (typeof window.requestAnimationFrame !== "function") {
      // oxlint-disable-next-line react/set-state-in-effect
      setPhase("idle");
      return;
    }
    const id = window.requestAnimationFrame(() => setPhase("filling"));
    return () => window.cancelAnimationFrame(id);
  }, [phase, introKey]);

  const scale = phase === "empty" ? 0 : clamped / 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
    >
      <div
        className={cn(
          "h-full w-full origin-left rounded-full transition-[transform,background-color] ease-calm-out",
          phase === "filling" ? "duration-[600ms]" : "duration-[400ms]",
          statusColor[status]
        )}
        style={{ transform: `scaleX(${scale})` }}
        onTransitionEnd={(e) => {
          if (phase === "filling" && e.propertyName === "transform") setPhase("idle");
        }}
      />
    </div>
  );
}
