import { lazyWithPreload } from "./lib/lazyWithPreload";

/**
 * Secondary screens are code-split so they stay out of the first load.
 * Dashboard is *not* here: it's the landing screen, so it's bundled with the
 * entry to avoid an extra network round trip before anything useful renders.
 */
export const Transactions = lazyWithPreload(() => import("./pages/Transactions"), "Transactions");
export const Analytics = lazyWithPreload(() => import("./pages/Analytics"), "Analytics");
export const Settings = lazyWithPreload(() => import("./pages/Settings"), "Settings");

/**
 * Warms every secondary chunk once the first screen is on-screen and the main
 * thread is idle. After this, switching tabs never needs the network again for
 * the lifetime of the page — so losing the connection mid-session can't break
 * navigation, even in dev (no service worker) or while a new service worker
 * version is swapping its caches.
 */
export function preloadSecondaryChunks(extra: Array<() => Promise<unknown>> = []): () => void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return () => {};

  const run = () => {
    // Sequential, lightest-first: never competes with itself on a slow link.
    const queue = [...extra, Transactions.preload, Analytics.preload, Settings.preload];
    queue.reduce<Promise<unknown>>((prev, next) => prev.then(next), Promise.resolve());
  };

  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(run, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(run, 1500);
  return () => window.clearTimeout(id);
}
