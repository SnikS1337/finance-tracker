import { useCallback, useEffect, useSyncExternalStore, type MouseEvent, type PointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import { scrollToTopSmooth } from "../../lib/scroll";
import { playPageExit } from "../../lib/pageTransition";

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

/** A press that moved further than this is a drag, not a tap. */
const TAP_SLOP_PX = 10;

/** The press in progress on a tab link (only one finger/mouse at a time here). */
let press: { to: string; x: number; y: number } | null = null;
/** Set when pointer-up already navigated, so the click that may follow doesn't repeat it. */
let handledByPointerUp = false;

/**
 * Handlers for a tab link: light up on touch, navigate on release, scroll to
 * top when the tab is already open.
 *
 * Navigation happens on pointer-up, not on the click: while the page is still
 * scrolling from a flick, mobile browsers use the tap to stop the scroll and
 * don't fire a click at all — the tab lit up, nothing happened, and it went
 * back after a moment. Pointer-up still arrives in that case. A real click
 * (keyboard, or a browser that sends no pointer events) keeps working as before.
 */
export function useTabHandlers() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return useCallback(
    (to: string) => ({
      onPointerDown: (e: PointerEvent<HTMLAnchorElement>) => {
        if (e.button !== 0) return;
        press = { to, x: e.clientX, y: e.clientY };
        handledByPointerUp = false;
        if (pathname !== to) setPending(navIndex(to));
      },
      onPointerUp: (e: PointerEvent<HTMLAnchorElement>) => {
        const p = press;
        press = null;
        if (!p || p.to !== to || e.button !== 0) return;
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_SLOP_PX) return setPending(null);
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // new tab/window: leave it to the link
        handledByPointerUp = true;
        // The click that normally follows comes within a few ms; if the browser
        // swallowed it (the flick case), don't let the flag eat a later click.
        window.setTimeout(() => (handledByPointerUp = false), 400);
        if (pathname === to) return scrollToTopSmooth();
        playPageExit(navIndex(to) > navIndex(pathname) ? 1 : -1);
        navigate(to);
      },
      onPointerCancel: () => {
        press = null;
        setPending(null);
      },
      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
        if (handledByPointerUp) {
          handledByPointerUp = false;
          e.preventDefault();
          return;
        }
        // Keyboard / no pointer events: the link navigates by itself.
        // Tapping the tab you're already on scrolls it back to the top, like native tab bars.
        if (pathname === to) scrollToTopSmooth();
      },
    }),
    [pathname, navigate]
  );
}

/** Test-only. */
export function resetPendingTabForTests() {
  setPending(null);
}
