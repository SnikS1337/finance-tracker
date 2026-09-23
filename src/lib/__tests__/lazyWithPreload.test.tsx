import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, Suspense, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { lazyWithPreload } from "../lazyWithPreload";
import { ChunkErrorBoundary } from "../../components/ui/ChunkErrorBoundary";
import { PageFallback } from "../../components/ui/PageFallback";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Covers the offline-navigation failure modes: a page chunk that is still
 * loading must show a fallback inside the shell (not an empty screen), and a
 * chunk that fails to load (offline) must show a recoverable error instead of
 * unmounting the whole app — and must actually retry the import afterwards.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Page() {
  return <h1>Loaded page</h1>;
}

async function mount(node: ReactNode) {
  // Async act: React 19 only schedules Suspense retries properly inside an awaited act().
  await act(async () => {
    root.render(
      <div data-testid="shell">
        <nav>Навигация</nav>
        <ChunkErrorBoundary>
          <Suspense fallback={<PageFallback />}>{node}</Suspense>
        </ChunkErrorBoundary>
      </div>
    );
  });
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const offlineError = () => new TypeError("Failed to fetch dynamically imported module: /assets/Analytics-abc.js");

describe("lazyWithPreload + ChunkErrorBoundary", () => {
  it("shows a loading state inside the shell while the chunk loads, then the page", async () => {
    const load = deferred<{ default: typeof Page }>();
    const Lazy = lazyWithPreload(() => load.promise);

    await mount(<Lazy />);
    // Navigation is still rendered — no blank screen — and a status placeholder is shown.
    expect(container.querySelector("nav")?.textContent).toBe("Навигация");
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelector("h1")).toBeNull();

    await act(async () => {
      load.resolve({ default: Page });
      await load.promise;
    });
    await flush();

    expect(container.querySelector("h1")?.textContent).toBe("Loaded page");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("shows a recoverable error (not an empty screen) when the chunk fails to load", async () => {
    const Lazy = lazyWithPreload<object>(() => Promise.reject(offlineError()));

    // React logs caught render errors; keep the test output clean.
    const originalError = console.error;
    console.error = () => {};
    try {
      await mount(<Lazy />);
      await flush();
      await flush();
    } finally {
      console.error = originalError;
    }

    expect(container.querySelector("nav")).not.toBeNull();
    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.querySelector("button")).not.toBeNull();
  });

  it("retries the import after a failure instead of caching the error forever", async () => {
    let attempts = 0;
    const Lazy = lazyWithPreload<object>(() => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(offlineError()) : Promise.resolve({ default: Page });
    });

    const originalError = console.error;
    console.error = () => {};
    try {
      await mount(<Lazy />);
      await flush();
      await flush();
      const retry = container.querySelector('[role="alert"] button');
      expect(retry).not.toBeNull();

      await act(async () => {
        retry!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flush();
      await flush();
    } finally {
      console.error = originalError;
    }

    expect(attempts).toBe(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("h1")?.textContent).toBe("Loaded page");
  });

  it("preload() never rejects, and a preloaded chunk renders without a loading flash", async () => {
    const Lazy = lazyWithPreload(() => Promise.resolve({ default: Page }));
    await Lazy.preload();

    const Failing = lazyWithPreload<object>(() => Promise.reject(offlineError()));
    await expect(Failing.preload()).resolves.toBe(undefined);

    // Synchronous act: if the component suspended even briefly, the fallback
    // (not the page) would be what's committed here.
    act(() => {
      root.render(
        <Suspense fallback={<PageFallback />}>
          <Lazy />
        </Suspense>
      );
    });
    expect(container.querySelector("h1")?.textContent).toBe("Loaded page");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
