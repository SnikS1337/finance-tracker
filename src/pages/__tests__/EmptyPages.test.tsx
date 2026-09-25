import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** With no operations every tab still has its title; Operations shows no period/search/filters over nothing. */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem("pft:transactions", "[]");
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

async function renderAt(hash: string) {
  window.location.hash = hash;
  await act(async () => {
    root.render(<App />);
  });
  for (let i = 0; i < 40 && !container.querySelector("main h1"); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

describe("empty app", () => {
  for (const [hash, title] of [
    ["#/", "Обзор"],
    ["#/transactions", "Операции"],
    ["#/analytics", "Аналитика"],
  ]) {
    it(`${hash} has its page title`, async () => {
      await renderAt(hash);
      expect(container.querySelector("main h1")?.textContent).toBe(title);
    });
  }

  it("Operations: just the empty state and the add button, no period, search or filters", async () => {
    await renderAt("#/transactions");
    expect(container.textContent).toContain("Пока нет операций");
    expect(container.querySelector("main input")).toBeNull();
    expect(container.querySelector("main select")).toBeNull();
    expect([...container.querySelectorAll("main button")].some((b) => b.textContent === "+ Добавить операцию")).toBe(true);
  });
});
