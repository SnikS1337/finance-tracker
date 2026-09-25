import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

const DURATION_MS = 250;
/** Ease-out cubic: quick, without a long slow tail. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that glides to its new value when it changes (e.g. after adding an
 * operation), instead of jumping. The first render shows the real value right
 * away — opening a screen never counts up from zero. Integers only (amounts).
 */
export function useAnimatedNumber(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const canTween =
      typeof window.requestAnimationFrame === "function" && document.visibilityState !== "hidden" && !prefersReducedMotion();
    const set = (v: number) => {
      shownRef.current = v;
      setShown(v);
    };
    if (!canTween) {
      // oxlint-disable-next-line react/set-state-in-effect
      set(value);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      set(progress === 1 ? value : Math.round(from + (value - from) * easeOut(progress)));
      frame.current = progress === 1 ? null : window.requestAnimationFrame(step);
    };
    frame.current = window.requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [value]);

  // A value change interrupted mid-way continues from where the number is now
  // (shownRef), so fast consecutive changes never jump backwards.
  return shown;
}
