import { canAnimate } from "./motion";

/**
 * Tab switch, part 1 (part 2 — the new page's entrance — is CSS, index.css).
 *
 * The current page starts leaving the moment a tab is released: it dims and
 * drifts away from the tab you're going to. Rendering the new page takes a
 * moment on a phone (~100–250 ms); the browser plays this on its compositor
 * meanwhile, so the switch is in motion from the tap instead of frozen, and
 * the new page slides in from the same side, continuing the movement.
 * `dir`: 1 = going to a tab further right, -1 = to the left.
 */
export function playPageExit(dir: 1 | -1): void {
  const page = document.querySelector<HTMLElement>("main .page-enter");
  if (!canAnimate(page)) return;
  const exit = page.animate(
    [
      { opacity: 1, transform: "none" },
      { opacity: 0.5, transform: `translate3d(${-dir * 8}px, 0, 0)` },
    ],
    { duration: 140, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
  );
  // The page is normally replaced long before this; if it somehow isn't, don't leave it dimmed.
  window.setTimeout(() => exit.cancel(), 1500);
}
