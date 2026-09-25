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
