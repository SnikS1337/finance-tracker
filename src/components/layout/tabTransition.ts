import { useCallback, useEffect, useSyncExternalStore, type MouseEvent } from "react";
import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import { scrollToTopSmooth } from "../../lib/scroll";

/**
 * Tab switching, tuned for feel (1.6):
 *
 * - The tab lights up on touch-down (a "pending" tab), before the new page has
 *   rendered, so a tap is acknowledged in the next frame.
 * - The page switches immediately (NavLink navigation) with a short fade-in
 *   that never blocks input. The earlier View Transitions version froze input
 *   for ~400 ms and made the switch feel slow and "jelly" on Android.
 */

/** Position of a path in the tab order (-1 if it isn't a tab). */
export function navIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) => (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)));
}

// ---- Pending tab (touched, not navigated yet) -------------------------------

/** If the navigation doesn't happen (finger slid off, click cancelled), drop the highlight. */
const PENDING_TIMEOUT_MS = 700;

let pending: number | null = null;
let pendingTimer: number | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setPending(index: number | null) {
  if (pending === index) return;
  pending = index;
  window.clearTimeout(pendingTimer);
  if (index !== null) pendingTimer = window.setTimeout(() => setPending(null), PENDING_TIMEOUT_MS);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * The tab to show as active: the one just touched, else the current route's.
 * Clears the touched one as soon as the route catches up.
 */
export function useShownTab(): number {
  const { pathname } = useLocation();
  const active = navIndex(pathname);
  const touched = useSyncExternalStore(subscribe, () => pending, () => null);
  useEffect(() => {
    if (pending !== null && pending === active) setPending(null);
  }, [active]);
  return touched ?? active;
}

/** Handlers for a tab link: light up on touch, scroll to top when it's already open. */
export function useTabHandlers() {
  const { pathname } = useLocation();
  return useCallback(
    (to: string) => ({
      onPointerDown: () => {
        if (pathname !== to) setPending(navIndex(to));
      },
      onClick: (_e: MouseEvent<HTMLAnchorElement>) => {
        // Tapping the tab you're already on scrolls it back to the top, like native tab bars.
        if (pathname === to) scrollToTopSmooth();
      },
    }),
    [pathname]
  );
}

/** Test-only. */
export function resetPendingTabForTests() {
  setPending(null);
}
