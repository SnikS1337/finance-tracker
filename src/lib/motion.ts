/**
 * Motion helpers. Every browser API here is feature-detected; without it the
 * app behaves exactly as before, just without the effect.
 */

/** Same curves as tailwind.config.js (`ease-calm-out` / `ease-calm-in`). */
export const EASE_CALM_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_CALM_IN = "cubic-bezier(0.7, 0, 0.84, 0)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Element.animate (Web Animations API) is available and motion is welcome. */
export function canAnimate(el: Element | null | undefined): el is HTMLElement {
  return !!el && typeof (el as HTMLElement).animate === "function" && !prefersReducedMotion();
}

/**
 * A short haptic tick where the Vibration API exists (Android Chrome). iOS
 * Safari has no `navigator.vibrate`, so there it's silently a no-op.
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when vibration isn't allowed (no user gesture yet); ignore.
  }
}
