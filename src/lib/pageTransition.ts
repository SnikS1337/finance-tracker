import { canAnimate } from "./motion";

/**
 * Page transition variants — a temporary prototype (1.6, step 7): the user
 * compares them on the phone, then the chosen one stays and this switch goes.
 *
 * Stored per device outside the app data (no `pft:` prefix: not exported,
 * not synced between tabs). The variant is a `data-page-transition`
 * attribute on <html>; the animations themselves are CSS (index.css).
 */
export type PageTransition = "slide" | "scale" | "fade";
export const PAGE_TRANSITIONS: readonly PageTransition[] = ["slide", "scale", "fade"];

const KEY = "finance-tracker:pageTransition";
const DEFAULT: PageTransition = "slide";

export function getPageTransition(): PageTransition {
  try {
    const v = window.localStorage.getItem(KEY);
    return (PAGE_TRANSITIONS as readonly string[]).includes(v ?? "") ? (v as PageTransition) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function applyPageTransition(value: PageTransition = getPageTransition()): void {
  document.documentElement.dataset.pageTransition = value;
}

export function setPageTransition(value: PageTransition): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Not saved — still applies for this session.
  }
  applyPageTransition(value);
}

/**
 * The current page starts leaving the moment a tab is released: it dims and
 * drifts away from the tab you're going to. Rendering the new page takes a
 * moment on a phone (~100–250 ms); the browser plays this on its compositor
 * meanwhile, so the switch is in motion from the tap instead of frozen, and
 * the new page's entrance (index.css) continues the same movement.
 * `dir`: 1 = going to a tab further right, -1 = to the left.
 */
export function playPageExit(dir: 1 | -1): void {
  const variant = document.documentElement.dataset.pageTransition;
  if (variant !== "slide" && variant !== "scale") return;
  const page = document.querySelector<HTMLElement>("main .page-enter");
  if (!canAnimate(page)) return;
  const to = variant === "slide" ? `translate3d(${-dir * 8}px, 0, 0)` : "scale(0.99)";
  const exit = page.animate([{ opacity: 1, transform: "none" }, { opacity: 0.5, transform: to }], {
    duration: 140,
    easing: "cubic-bezier(0.4, 0, 1, 1)",
    fill: "forwards",
  });
  // The page is normally replaced long before this; if it somehow isn't, don't leave it dimmed.
  window.setTimeout(() => exit.cancel(), 1500);
}
