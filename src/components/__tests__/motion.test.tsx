import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ProgressBar } from "../ui/ProgressBar";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { BottomNav } from "../layout/BottomNav";
import { navIndex, settleTabTransition } from "../layout/tabTransition";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let frames: FrameRequestCallback[];

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  delete document.documentElement.dataset.navDirection;
});

/** Runs the queued animation frames at the given time. */
function runFrames(now: number) {
  const queued = frames;
  frames = [];
  act(() => queued.forEach((cb) => cb(now)));
}

const bar = () => container.querySelector<HTMLElement>('[role="progressbar"] > div')!;

describe("budget progress bar", () => {
  it("fills in from zero the first time in a launch", () => {
    act(() => root.render(<ProgressBar percentage={50} status="normal" introKey="test:first" />));
    expect(bar().style.transform).toBe("scaleX(0)");
    runFrames(16);
    expect(bar().style.transform).toBe("scaleX(0.5)");
    expect(bar().className).toContain("duration-[600ms]");
  });

  it("is drawn in place when shown again, and glides on changes", () => {
    act(() => root.render(<ProgressBar percentage={50} status="normal" introKey="test:again" />));
    runFrames(16);
    act(() => root.unmount());
    act(() => {
      root = createRoot(container);
    });
    act(() => root.render(<ProgressBar percentage={50} status="normal" introKey="test:again" />));
    expect(bar().style.transform).toBe("scaleX(0.5)");
    act(() => root.render(<ProgressBar percentage={90} status="approaching" introKey="test:again" />));
    expect(bar().style.transform).toBe("scaleX(0.9)");
    expect(bar().className).toContain("duration-[400ms]");
    expect(bar().className).toContain("bg-amber-500");
  });

  it("without an intro key there's no fill-in", () => {
    act(() => root.render(<ProgressBar percentage={30} status="normal" />));
    expect(bar().style.transform).toBe("scaleX(0.3)");
  });
});

describe("animated numbers", () => {
  it("shows the real value on first render, then glides to a new one", () => {
    act(() => root.render(<AnimatedNumber value={1000} />));
    expect(container.textContent).toBe("1000");
    const t0 = performance.now();
    act(() => root.render(<AnimatedNumber value={2000} />));
    expect(container.textContent).toBe("1000");
    runFrames(t0 + 100);
    const mid = Number(container.textContent);
    expect(mid).toBeGreaterThan(1000);
    expect(mid).toBeLessThan(2000);
    runFrames(t0 + 1000);
    expect(container.textContent).toBe("2000");
  });

  it("jumps straight to the value without requestAnimationFrame", () => {
    vi.stubGlobal("requestAnimationFrame", undefined);
    act(() => root.render(<AnimatedNumber value={1} />));
    act(() => root.render(<AnimatedNumber value={5} />));
    expect(container.textContent).toBe("5");
  });
});

describe("tab switches", () => {
  function Where() {
    return <span data-testid="where">{useLocation().pathname}</span>;
  }
  const renderNav = (path = "/") =>
    act(() =>
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <BottomNav onAdd={() => {}} />
          <Where />
        </MemoryRouter>
      )
    );
  const link = (label: string) => container.querySelector<HTMLAnchorElement>(`a[aria-label="${label}"]`)!;
  const where = () => container.querySelector('[data-testid="where"]')!.textContent;
  const click = (el: Element) =>
    act(() => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    });

  it("knows the tab order", () => {
    expect(["/", "/transactions", "/analytics", "/settings", "/nope"].map(navIndex)).toEqual([0, 1, 2, 3, -1]);
  });

  it("navigates normally without the View Transitions API", () => {
    renderNav();
    click(link("Аналитика"));
    expect(where()).toBe("/analytics");
  });

  it("uses document.startViewTransition when available, with the direction of the tab order", async () => {
    let finish!: () => void;
    const start = vi.fn((update: () => Promise<void>) => {
      const done = update();
      return { ready: Promise.resolve(), updateCallbackDone: done, finished: new Promise<void>((r) => (finish = r)) };
    });
    (document as { startViewTransition?: unknown }).startViewTransition = start;

    renderNav("/settings");
    click(link("Операции"));
    expect(start).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navDirection).toBe("back");
    expect(where()).toBe("/transactions");
    settleTabTransition();

    await act(async () => {
      finish();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.documentElement.dataset.navDirection).toBeUndefined();
  });

  it("the indicator sits under the active tab (skipping the '+' column)", () => {
    renderNav("/analytics");
    const indicator = container.querySelector<HTMLElement>(".nav-indicator")!;
    expect(indicator.style.transform).toBe("translateX(300%)");
  });
});
