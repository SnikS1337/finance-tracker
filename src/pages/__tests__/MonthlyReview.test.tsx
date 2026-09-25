import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";
import { DEFAULT_CATEGORIES } from "../../lib/seed";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** "Итоги прошлого месяца" on the Overview. */

// A fixed "now" (same approach as useToday.test): only `new Date()` / `Date.now()` are faked.
const RealDate = Date;
let fakeNow = 0;
class FakeDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(fakeNow);
    else super(...(args as [number]));
  }
  static now() {
    return fakeNow;
  }
}

let container: HTMLDivElement;
let root: Root;
const food = DEFAULT_CATEGORIES.find((c) => c.type === "expense")!;

function seed() {
  const at = "2026-08-01T00:00:00.000Z";
  const tx = (id: string, date: string, amount: number) => ({
    id, type: "expense", amount, categoryId: food.id, date, createdAt: at, updatedAt: at,
  });
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem("pft:categories", JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([tx("jul", "2026-07-10", 1000), tx("aug", "2026-08-10", 800), tx("sep", "2026-09-02", 100)])
  );
}

beforeEach(() => {
  localStorage.clear();
  seed();
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

async function renderOverviewOn(date: Date) {
  fakeNow = date.getTime();
  vi.stubGlobal("Date", FakeDate);
  window.location.hash = "#/";
  await act(async () => {
    root.render(<App />);
  });
  for (let i = 0; i < 30 && !container.querySelector("main h1"); i++) await settle();
  await settle();
}

const card = () => container.querySelector<HTMLElement>('[data-testid="monthly-review"]');

describe("monthly review card", () => {
  it("shows last month's results on the first days of a month", async () => {
    await renderOverviewOn(new RealDate(2026, 8, 3, 12));
    const text = card()?.textContent ?? "";
    expect(text).toContain("Итоги августа");
    expect(text).toContain("800");
    expect(text).toContain(`${food.name}: 100% расходов`);
    expect(text).toContain("Расходы на 20% меньше, чем в июле");
  });

  it("isn't there after the 7th", async () => {
    await renderOverviewOn(new RealDate(2026, 8, 8, 12));
    expect(card()).toBeNull();
  });

  it("opens Analytics for last month", async () => {
    await renderOverviewOn(new RealDate(2026, 8, 3, 12));
    await act(async () => card()!.click());
    await settle();
    expect(window.location.hash).toBe("#/analytics?period=lastMonth");
  });

  it("the × hides it until next month", async () => {
    await renderOverviewOn(new RealDate(2026, 8, 3, 12));
    await act(async () => card()!.querySelector("button")!.click());
    expect(card()).toBeNull();
    expect(window.location.hash).toBe("#/"); // the × doesn't open Analytics
    expect(localStorage.getItem("pft:monthlyReviewDismissed")).toBe("2026-08");

    // Still hidden after reopening the app…
    act(() => root.unmount());
    act(() => {
      root = createRoot(container);
    });
    await renderOverviewOn(new RealDate(2026, 8, 4, 12));
    expect(card()).toBeNull();

    // …and October's review (of September) shows again.
    act(() => root.unmount());
    act(() => {
      root = createRoot(container);
    });
    await renderOverviewOn(new RealDate(2026, 9, 1, 12));
    expect(card()?.textContent).toContain("Итоги сентября");
  });
});
