import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";
import { todayKey } from "../../lib/date-utils";
import { DEFAULT_CATEGORIES } from "../../lib/seed";
import { t } from "../../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Budget on the dashboard, period kept in the URL, sync between tabs. */

let container: HTMLDivElement;
let root: Root;
const food = DEFAULT_CATEGORIES.find((c) => c.type === "expense")!;
const nowIso = new Date().toISOString();
const txn = (id: string, amount: number, categoryId = food.id) => ({
  id,
  type: "expense",
  amount,
  categoryId,
  date: todayKey(),
  createdAt: nowIso,
  updatedAt: nowIso,
});

function seed(budgets: unknown[] = []) {
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem("pft:categories", JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem("pft:transactions", JSON.stringify([txn("t1", 90_000)]));
  localStorage.setItem("pft:budgets", JSON.stringify(budgets));
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
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
}

async function waitFor(check: () => boolean) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > 3000) throw new Error("waitFor timed out");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

const budgetSection = () => container.querySelector(`section[aria-label="${t.dashboard.budgetsTitle}"]`);
const pressedPreset = () => container.querySelector('[role="group"] button[aria-pressed="true"]')?.textContent;

describe("Dashboard budgets", () => {
  it("shows the overall budget and category budgets that need attention", async () => {
    seed([
      { id: "overall", amount: 1_000_000, createdAt: "", updatedAt: "" },
      { id: "food", categoryId: food.id, amount: 100_000, createdAt: "", updatedAt: "" }, // 90% → shown
      { id: "other", categoryId: DEFAULT_CATEGORIES[2].id, amount: 100_000, createdAt: "", updatedAt: "" }, // 0% → hidden
    ]);
    await renderAt("#/");
    const section = budgetSection();
    expect(section).not.toBeNull();
    const bars = section!.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(2);
    expect(section!.textContent?.includes(food.name)).toBe(true);
    expect(section!.textContent?.includes("90%")).toBe(true);
  });

  it("renders nothing when no budgets are set", async () => {
    seed();
    await renderAt("#/");
    expect(budgetSection()).toBeNull();
  });
});

describe("period in the URL", () => {
  it("Analytics reads the period from the URL and writes changes back", async () => {
    seed();
    await renderAt("#/analytics?period=lastMonth");
    await waitFor(() => !!pressedPreset());
    expect(pressedPreset()).toBe(t.period.lastMonth);

    const thisYear = [...container.querySelectorAll('[role="group"] button')].find((b) => b.textContent === t.period.thisYear)!;
    await act(async () => {
      thisYear.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(window.location.hash).toContain("period=thisYear");
    expect(pressedPreset()).toBe(t.period.thisYear);
  });

  it("Transactions keeps the period when the category filter changes", async () => {
    seed();
    await renderAt("#/transactions?period=thisYear");
    await waitFor(() => container.querySelectorAll("main select").length > 1);
    const select = container.querySelectorAll<HTMLSelectElement>("main select")[1];
    await act(async () => {
      select.value = food.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(window.location.hash).toContain("period=thisYear");
    expect(window.location.hash).toContain(`category=${food.id}`);
  });
});

describe("sync between tabs", () => {
  it("re-reads data when another tab changes it", async () => {
    seed();
    await renderAt("#/");
    expect(container.textContent?.includes("90 000")).toBe(true);

    localStorage.setItem("pft:transactions", JSON.stringify([txn("t1", 90_000), txn("t2", 5_000)]));
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "pft:transactions" }));
    });
    expect(container.textContent?.includes("95 000")).toBe(true);
  });
});
