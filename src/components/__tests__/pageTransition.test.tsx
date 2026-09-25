import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";
import { DEFAULT_CATEGORIES } from "../../lib/seed";
import { todayKey } from "../../lib/date-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Tab switch motion: the old page leaves on tap, the new one slides in from the side of the tab. */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  const at = new Date().toISOString();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem("pft:categories", JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([
      { id: "t1", type: "expense", amount: 1000, categoryId: DEFAULT_CATEGORIES[0].id, date: todayKey(), createdAt: at, updatedAt: at },
    ])
  );
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
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
  window.location.hash = "";
  vi.unstubAllGlobals();
});

async function settle() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

async function go(path: string) {
  const link = container.querySelector<HTMLAnchorElement>(`a[href="#${path}"]`)!;
  await act(async () => link.click());
  for (let i = 0; i < 30 && !container.querySelector("main .page-enter h1"); i++) await settle();
  await settle();
}

const dir = () => container.querySelector<HTMLElement>("main .page-enter")!.style.getPropertyValue("--page-dir");

describe("page entrance", () => {
  it("comes in from the side of the tab you're going to", async () => {
    window.location.hash = "#/";
    await act(async () => root.render(<App />));
    for (let i = 0; i < 30 && !container.querySelector("main .page-enter h1"); i++) await settle();
    expect(dir()).toBe("0"); // first open: nowhere to come from
    const switched = () => container.querySelector("main .page-enter")!.classList.contains("page-enter--switch");
    expect(switched()).toBe(false); // first open keeps the cards' own entrance

    await go("/settings");
    expect(dir()).toBe("1"); // Overview → Settings: from the right
    expect(switched()).toBe(true); // a tab switch moves the page as one piece
    await go("/transactions");
    expect(dir()).toBe("-1"); // Settings → Operations: from the left
    await go("/analytics");
    expect(dir()).toBe("1");
  });

  it("the current page starts leaving on tap, away from the tab you're going to", async () => {
    const calls: { el: Element; keyframes: Keyframe[] }[] = [];
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = function (this: Element, keyframes: Keyframe[]) {
      calls.push({ el: this, keyframes });
      return { cancel() {} };
    };
    try {
      window.location.hash = "#/";
      await act(async () => root.render(<App />));
      for (let i = 0; i < 30 && !container.querySelector("main .page-enter h1"); i++) await settle();
      const page = container.querySelector("main .page-enter");
      const tab = container.querySelector<HTMLAnchorElement>('nav.app-nav--bottom a[href="#/settings"]')!;
      // A real tap: pointer-down, pointer-up, then the click (which the tab ignores after handling pointer-up).
      for (const type of ["pointerdown", "pointerup", "click"]) {
        await act(async () => {
          tab.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 5, clientY: 5 }));
        });
      }
      const call = calls.find((c) => c.el === page);
      expect(call).toBeDefined();
      expect(call!.keyframes[1]).toMatchObject({ opacity: 0.5, transform: "translate3d(-8px, 0, 0)" }); // going right → drifts left
      await settle();
      expect(window.location.hash).toBe("#/settings");
    } finally {
      delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    }
  });
});
