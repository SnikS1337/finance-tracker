/**
 * The startup screen is plain HTML/CSS inlined in index.html, so it paints on
 * the very first frame — before any JS or the main stylesheet has downloaded.
 * The app removes it once its first real screen has committed.
 */
const STARTUP_ID = "startup";
const FADE_MS = 280;

/** Idempotent: safe to call repeatedly (StrictMode double effects, remounts). */
export function hideStartupScreen(): void {
  if (typeof document === "undefined") return;

  const el = document.getElementById(STARTUP_ID);
  if (!el || el.classList.contains("startup--hide")) return;
  // index.html detected a failed load (e.g. the stylesheet) and shows "Повторить";
  // starting an unstyled app underneath would be worse.
  if ((window as { __appLoadFailed?: boolean }).__appLoadFailed) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduceMotion) {
    el.remove();
    return;
  }

  // Called from an effect, i.e. after the app's first commit, so the real UI is
  // already underneath when the fade starts. (No requestAnimationFrame here: it
  // never fires in a background tab, which would leave the overlay up.)
  el.classList.add("startup--hide");
  window.setTimeout(() => el.remove(), FADE_MS + 60);
}
