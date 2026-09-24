import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Regression: "Посмотреть на демо-данных" left the app stuck on the onboarding screen. */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
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

async function start(label: string) {
  await act(async () => {
    root.render(<App />);
  });
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);
  expect(button).toBeTruthy();
  await act(async () => {
    button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  });
}

describe("onboarding", () => {
  it("'Посмотреть на демо-данных' opens the app with demo data", async () => {
    await start("Посмотреть на демо-данных");
    expect(container.textContent).not.toContain("Начать с чистого листа");
    expect(JSON.parse(localStorage.getItem("pft:settings")!)).toMatchObject({ onboarded: true, isDemoData: true });
    expect(JSON.parse(localStorage.getItem("pft:transactions")!).length).toBeGreaterThan(0);
  });

  it("'Начать с чистого листа' opens an empty app", async () => {
    await start("Начать с чистого листа");
    expect(container.textContent).not.toContain("Посмотреть на демо-данных");
    expect(JSON.parse(localStorage.getItem("pft:settings")!)).toMatchObject({ onboarded: true, isDemoData: false });
  });
});
