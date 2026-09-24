import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * One line of text (typically an amount) that shrinks its font to fit the
 * available width instead of wrapping or overflowing — "678 678 678 678 ₫"
 * stays on one line in a narrow card. Never below `minScale` of the normal
 * size; past that it's cut with an ellipsis. Measured after every render and
 * whenever the box is resized.
 */
export function FitText({
  children,
  className,
  minScale = 0.55,
}: {
  children: ReactNode;
  className?: string;
  minScale?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = "";
    const available = el.clientWidth;
    const needed = el.scrollWidth;
    if (available <= 0 || needed <= available) return;
    const base = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(base) || base <= 0) return;
    const size = Math.max(base * minScale, Math.floor(((base * available) / needed) * 10) / 10);
    el.style.fontSize = `${size}px`;
  };

  // Every render: the text may have changed (e.g. a number gliding to a new value).
  useLayoutEffect(fit);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cleanups: Array<() => void> = [];
    if (typeof ResizeObserver !== "undefined") {
      let lastWidth = el.clientWidth;
      const resize = new ResizeObserver(() => {
        // Only width matters; ignore the height change caused by fitting itself.
        if (el.clientWidth === lastWidth) return;
        lastWidth = el.clientWidth;
        fit();
      });
      resize.observe(el);
      cleanups.push(() => resize.disconnect());
    }
    // Text updated by a child alone (AnimatedNumber re-renders without this component).
    if (typeof MutationObserver !== "undefined") {
      const mutation = new MutationObserver(fit);
      mutation.observe(el, { characterData: true, childList: true, subtree: true });
      cleanups.push(() => mutation.disconnect());
    }
    return () => cleanups.forEach((c) => c());
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  return (
    <span ref={ref} className={cn("block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap", className)}>
      {children}
    </span>
  );
}
