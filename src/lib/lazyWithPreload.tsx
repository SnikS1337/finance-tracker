import { createElement, use, type ComponentType, type JSX } from "react";

/**
 * A small replacement for `React.lazy` that fixes the two things that made
 * offline navigation fall apart:
 *
 * 1. **Preloading.** `preload()` starts (or reuses) the dynamic import without
 *    rendering anything, so route/chart chunks can be warmed up while the
 *    network is still there. Once a chunk has been imported, the module lives
 *    in the page's module map and later navigations never touch the network.
 *
 * 2. **Retry after failure.** `React.lazy` caches a rejected import forever, so
 *    a single failed chunk request (offline, flaky 3G, a deploy that replaced
 *    hashed files) permanently breaks that screen until a full reload. Here a
 *    failed load is surfaced once to the nearest error boundary, and
 *    `retryFailedChunks()` (called by the boundary's "retry" button) clears
 *    the failed promise so the next render tries the import again.
 */

type Loaded<P> = ComponentType<P>;

// React reads `status`/`value` on thenables passed to `use()`; setting them
// ourselves means an already-loaded chunk renders synchronously instead of
// suspending for a microtask (which would flash the fallback on every visit).
type TrackedPromise<T> = Promise<T> & { status?: "pending" | "fulfilled" | "rejected"; value?: T; reason?: unknown };

export type PreloadableComponent<P> = ((props: P) => JSX.Element) & {
  /** Starts loading the chunk (idempotent). Never rejects. */
  preload: () => Promise<unknown>;
  displayName?: string;
};

const failed = new Set<() => void>();

/** Clears every failed chunk load so the next render re-attempts the import. */
export function retryFailedChunks(): void {
  for (const reset of failed) reset();
  failed.clear();
}

export function lazyWithPreload<P extends object>(
  factory: () => Promise<{ default: Loaded<P> }>,
  name?: string
): PreloadableComponent<P> {
  let promise: TrackedPromise<Loaded<P>> | null = null;

  const reset = () => {
    promise = null;
  };

  const load = (): TrackedPromise<Loaded<P>> => {
    if (promise) return promise;
    const p = factory().then(
      (module) => {
        p.status = "fulfilled";
        p.value = module.default;
        return module.default;
      },
      (error: unknown) => {
        p.status = "rejected";
        p.reason = error;
        failed.add(reset);
        throw error;
      }
    ) as TrackedPromise<Loaded<P>>;
    p.status = "pending";
    promise = p;
    return p;
  };

  function LazyComponent(props: P) {
    // `Component` is the module's export, cached in `promise` above — the same
    // identity on every render, not a component created during render.
    const Component = use(load() as Promise<Loaded<P>>);
    return createElement(Component, props);
  }

  LazyComponent.displayName = name ? `Lazy(${name})` : "Lazy";
  LazyComponent.preload = () => load().catch(() => undefined);
  return LazyComponent as PreloadableComponent<P>;
}
