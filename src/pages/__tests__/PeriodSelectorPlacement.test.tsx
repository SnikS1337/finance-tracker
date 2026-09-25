import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";
import { todayKey } from "../../lib/date-utils";
import { t } from "../../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The period selector lives only in Analytics now; the Dashboard is a fixed
 * "this month" overview. Rendered through the real App (router, providers,
 * lazy Analytics chunk), with the network stubbed as offline.
 */

let container: HTMLDivElement;
let root: Root;

function seed() {
  const now = new Date().toISOString();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([
      {
        id: "tx-1",
        type: "expense",
        amount: 150_000,
        categoryId: "exp-food",
        date: todayKey(),
        createdAt: now,
        updatedAt: now,
      },
    ])
  );
}

beforeEach(() => {
  localStorage.clear();
  seed();
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  );
  // Recharts' ResponsiveContainer needs it; jsdom doesn't have it.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  // Offline: the RUB rate refresh must fail quietly.
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

function periodSelector() {
  return container.querySelector(`[role="group"][aria-label="${t.period.groupLabel}"]`);
}

function heading() {
  return container.querySelector("h1")?.textContent ?? null;
}

async function waitFor(check: () => boolean, timeoutMs = 3000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error("waitFor: timed out");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

describe("PeriodSelector placement", () => {
  it("is not rendered on the Dashboard, and the dashboard still shows its summary", async () => {
    window.location.hash = "#/";
    // Awaited: the lazy chart cards suspend while their chunk loads.
    await act(async () => {
      root.render(<App />);
    });

    expect(heading()).toBe(t.dashboard.title);
    expect(periodSelector()).toBeNull();
    // None of the preset chips leaked onto the page either.
    const text = container.textContent ?? "";
    expect(text.includes(t.period.last7Days)).toBe(false);
    expect(text.includes(t.period.custom)).toBe(false);
    // Summary is computed for the current month without the selector.
    expect(text.includes(t.dashboard.periodCaption)).toBe(true);
    expect(text.includes("150")).toBe(true);
    // "Spent today" line (the seeded expense is dated today).
    expect(text.includes(t.dashboard.todaySpent(""))).toBe(true);
    // Charts by time and by category live in Analytics only (1.6).
    expect(text.includes(t.chart.spendingOverTime)).toBe(false);
    expect(text.includes(t.categoryBreakdown.spendingByCategory)).toBe(false);
  });

  it("is still rendered in Analytics", async () => {
    window.location.hash = "#/analytics";
    await act(async () => {
      root.render(<App />);
    });

    await waitFor(() => heading() === t.analytics.title);
    const selector = periodSelector();
    expect(selector).not.toBeNull();
    expect(selector?.textContent?.includes(t.period.last7Days)).toBe(true);
    expect(selector?.textContent?.includes(t.period.custom)).toBe(true);
  });
});
