import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../../App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Regression: a single broken entry in storage crashed the whole app on start. */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([
      null,
      { id: "ok", type: "expense", amount: 45_000, categoryId: "exp-food", date: new Date().toISOString().slice(0, 10), createdAt: "", updatedAt: "" },
    ])
  );
  vi.stubGlobal("scrollTo", () => {});
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
  act(() => root.unmount());
  container.remove();
  window.location.hash = "";
  vi.unstubAllGlobals();
});

describe("damaged storage", () => {
  it("the app still starts and shows the good data", async () => {
    await act(async () => {
      root.render(<App />);
    });
    expect(container.textContent?.replace(/\s/g, "")).toContain("45000₫");
  });
});
