import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";
import { subDays, toDateKey, todayKey } from "../../lib/date-utils";
import { DEFAULT_CATEGORIES } from "../../lib/seed";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A search in Operations looks through all time, not only the selected period. */

let container: HTMLDivElement;
let root: Root;
const expense = DEFAULT_CATEGORIES.find((c) => c.type === "expense")!;

beforeEach(() => {
  localStorage.clear();
  const now = new Date().toISOString();
  const tx = (id: string, date: string, note: string) => ({
    id, type: "expense", amount: 1000, categoryId: expense.id, date, note, createdAt: now, updatedAt: now,
  });
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem("pft:categories", JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([tx("recent", todayKey(), "кофе"), tx("old", toDateKey(subDays(new Date(), 400)), "подарок маме")])
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

async function renderTransactions() {
  window.location.hash = "#/transactions";
  await act(async () => {
    root.render(<App />);
  });
  const started = Date.now();
  while (!container.querySelector("main input") && Date.now() - started < 3000) await settle();
}

async function type(value: string) {
  const input = container.querySelector<HTMLInputElement>("main input")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
}

const text = () => container.textContent ?? "";
const button = (label: string) => [...container.querySelectorAll("main button")].find((b) => b.textContent === label) as HTMLButtonElement;

describe("search over all time", () => {
  it("finds an operation outside the selected period and can narrow back to it", async () => {
    await renderTransactions();
    expect(text()).toContain("кофе");
    expect(text()).not.toContain("подарок");

    await type("подарок");
    expect(text()).toContain("подарок маме");
    expect(text()).toContain("Найдено: 1 за всё время");

    await act(async () => button("Только за этот месяц").click());
    await settle();
    expect(text()).toContain("Найдено: 0 за этот месяц");
    expect(text()).not.toContain("подарок маме");

    await act(async () => button("Искать за всё время").click());
    await settle();
    expect(text()).toContain("подарок маме");
  });

  it("goes back to the period when the search is cleared, and a new search is all-time again", async () => {
    await renderTransactions();
    await type("подарок");
    await act(async () => button("Только за этот месяц").click());
    await type("");
    expect(text()).toContain("кофе");
    expect(text()).not.toContain("подарок");
    expect(text()).not.toContain("Найдено");

    await type("подарок");
    expect(text()).toContain("Найдено: 1 за всё время");
  });
});
