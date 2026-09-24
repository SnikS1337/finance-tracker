import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { estimateWidthEm } from "../../lib/fitText";

/**
 * One line of text (typically an amount) whose font shrinks to fit the width
 * of its box instead of wrapping or being cut — "678 678 678 678 ₫" stays
 * whole in a narrow card. Pure CSS: the box is a size container and the font
 * size is `min(1em, 100cqi / estimated width)`, so it's right on the very first
 * paint, on rotation/resize, and needs no measuring. Never below `minScale` of
 * the normal size (then an ellipsis). Browsers without container units simply
 * keep the normal size.
 *
 * `text` is the string used for the estimate; pass it when `children` isn't a
 * plain string (e.g. an AnimatedNumber — use its final value).
 */
export function FitText({
  text,
  children,
  className,
  minScale = 0.5,
}: {
  text?: string;
  children?: ReactNode;
  className?: string;
  minScale?: number;
}) {
  const content = text ?? (typeof children === "string" ? children : "");
  // Slack for wider bold glyphs in some system fonts (checked in Chromium: 1.06 fits exactly).
  const em = Math.max(1, estimateWidthEm(content) * 1.12);
  return (
    <span className={cn("block min-w-0 [container-type:inline-size]", className)}>
      <span
        className="block overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ fontSize: `max(${minScale}em, min(1em, calc(100cqi / ${em.toFixed(2)})))` }}
      >
        {children ?? text}
      </span>
    </span>
  );
}
