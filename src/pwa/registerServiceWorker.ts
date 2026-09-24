import { markUpdateAvailable } from "./appUpdate";

/** How often an open app asks the server whether a new version was deployed. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
/** Coming back to the app checks too, but not more often than this. */
const MIN_CHECK_GAP_MS = 5 * 60 * 1000;

/**
 * Registers the service worker in "prompt" mode: a new version is downloaded in
 * the background and waits; the app shows a banner and switches only when the
 * user taps "Обновить" — no reload in the middle of entering an operation.
 *
 * Works the same on Android, iOS and desktop. Installed apps (notably on iOS)
 * can stay open for days without a navigation, which is when browsers normally
 * look for updates, so the app also checks hourly and whenever it comes back to
 * the foreground.
 */
export function registerServiceWorker(): void {
  // Feature detection: no service workers (old browsers, some private modes) →
  // the app simply works online-only, without update prompts.
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  // Loaded lazily so workbox-window stays out of the entry chunk.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh: () => markUpdateAvailable(() => updateSW(true)),
        onRegisteredSW: (_url, registration) => {
          if (!registration) return;
          let lastCheck = Date.now();
          const check = () => {
            if (registration.installing || navigator.onLine === false) return;
            lastCheck = Date.now();
            registration.update().catch(() => {
              // Offline or the server is unreachable: try again next time.
            });
          };
          window.setInterval(check, CHECK_INTERVAL_MS);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && Date.now() - lastCheck > MIN_CHECK_GAP_MS) check();
          });
        },
      });
    })
    .catch(() => {
      // Registration module failed to load (e.g. offline on a first visit): ignore.
    });
}
