import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../../App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Switching tabs must not carry the previous tab's scroll position over. */

let container: HTMLDivElement;
let root: Root;
const scrollTo = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  scrollTo.mockClear();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
  window.location.hash = "#/";

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

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}

describe("tab switching", () => {
  it("scrolls to the top when the route changes", async () => {
    await act(async () => {
      root.render(<App />);
    });
    scrollTo.mockClear();

    await act(async () => {
      window.location.hash = "#/settings";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await flush();

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("tapping the already-active tab scrolls back to the top", async () => {
    await act(async () => {
      root.render(<App />);
    });
    scrollTo.mockClear();

    const activeTab = container.querySelector<HTMLAnchorElement>('nav a[href="#/"]');
    expect(activeTab).not.toBeNull();
    act(() => {
      activeTab!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
