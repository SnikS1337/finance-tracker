import { useSyncExternalStore } from "react";
import { todayKey } from "../lib/date-utils";

/**
 * Today's date key ("yyyy-MM-dd"), kept current while the app stays open:
 * it re-renders subscribers right after midnight, and when the app comes back
 * to the foreground (a phone app can sleep in the background for days, and
 * timers don't run meanwhile). Without this, "Today" / "This month" kept
 * showing the day the screen was opened.
 */
function subscribe(onChange: () => void): () => void {
  let timer: number | undefined;

  const schedule = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    timer = window.setTimeout(() => {
      onChange();
      schedule();
    }, nextMidnight.getTime() - now.getTime());
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };

  schedule();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onChange);
  };
}

export function useToday(): string {
  // A string snapshot: React only re-renders when the day actually changes.
  return useSyncExternalStore(subscribe, todayKey, todayKey);
}
