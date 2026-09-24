import { useCallback, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import { prefersReducedMotion } from "../../lib/motion";
import { scrollToTopSmooth } from "../../lib/scroll";

/**
 * Tab switches with the View Transitions API: the page slides a little in the
 * direction of the tab order while the nav indicator glides to the new tab.
 *
 * Not via NavLink's `viewTransition` prop: with HashRouter (declarative mode)
 * React Router 7.18 only calls `document.startViewTransition` in data routers,
 * so here it's done by hand. Feature-detected; without the API (or with reduced
 * motion) NavLink navigates normally and the tab changes instantly.
 */

/** Position of a path in the tab order (-1 if it isn't a tab). */
export function navIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) => (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)));
}

/** Longest the transition waits for the new page to render before giving up on animating. */
const MAX_WAIT_MS = 1_000;

let settle: (() => void) | null = null;
/** Id of the newest tab transition, so an older one finishing doesn't clean up after a newer one. */
let latest = 0;

/**
 * Called once the new route has rendered (AppShell's layout effect on
 * pathname): lets the pending transition capture the new page.
 */
export function settleTabTransition(): void {
  settle?.();
  settle = null;
}

function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

/** onClick for a tab link. */
export function useTabClick() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      // Tapping the tab you're already on scrolls it back to the top, like native tab bars.
      if (pathname === to) {
        scrollToTopSmooth();
        return;
      }
      const plainClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
      if (!plainClick || !supportsViewTransitions() || prefersReducedMotion()) return;

      e.preventDefault();
      const id = ++latest;
      const root = document.documentElement;
      root.dataset.navDirection = navIndex(to) > navIndex(pathname) ? "forward" : "back";
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
            window.setTimeout(resolve, MAX_WAIT_MS);
            navigate(to);
          })
      );
      // `ready` rejects when the animation is skipped (e.g. the page took too
      // long); navigation has happened either way, so that's fine.
      transition.ready.catch(() => {});
      transition.finished
        .finally(() => {
          if (id === latest) delete root.dataset.navDirection;
        })
        .catch(() => {});
    },
    [pathname, navigate]
  );
}
