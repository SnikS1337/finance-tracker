/** Smoothly scrolls the page back to the top (instantly when reduced motion is preferred). */
export function scrollToTopSmooth(): void {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}
