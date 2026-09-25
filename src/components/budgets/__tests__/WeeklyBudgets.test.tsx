import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../../App";
import * as storage from "../../../lib/storage";
import { todayKey } from "../../../lib/date-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Monthly and weekly budgets side by side (1.6). */

let container: HTMLDivElement;
let root: Root;

function seed(budgets: unknown[]) {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([{ id: "t", type: "expense", amount: 900_000, categoryId: "exp-food", date: todayKey(), createdAt: "", updatedAt: "" }])
  );
  localStorage.setItem("pft:budgets", JSON.stringify(budgets));
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));
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

async function open(hash: string) {
  window.location.hash = hash;
  await act(async () => {
    root.render(<App />);
  });
  // Lazy pages (Settings) need a moment for their chunk.
  for (let i = 0; i < 50 && !container.querySelector("h1"); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

const b = (over: object) => ({ id: "b", amount: 1_000_000, createdAt: "", updatedAt: "", ...over });

describe("weekly budgets", () => {
  it("the Overview shows the monthly and the weekly overall budget", async () => {
    seed([b({ id: "m" }), b({ id: "w", period: "week" })]);
    await open("#/");
    expect(container.textContent).toContain("Бюджет на месяц");
    expect(container.textContent).toContain("Бюджет на неделю");
  });

  it("Settings offers only the missing overall period, and tags weekly category budgets", async () => {
    seed([b({ id: "m" }), b({ id: "wf", categoryId: "exp-food", period: "week" })]);
    await open("#/settings");
    const buttons = [...container.querySelectorAll("button")].map((x) => x.textContent?.trim());
    expect(buttons).toContain("+ Бюджет на неделю");
    expect(buttons).not.toContain("+ Бюджет на месяц");
    expect(container.textContent).toContain("неделя");
  });

  it("a budget saved before 1.6 (no period) counts as monthly", () => {
    seed([b({ id: "old" })]);
    expect(storage.getBudgets()[0].period).toBeUndefined();
  });

  it("backups: weekly budgets round-trip; an unknown period is rejected", () => {
    seed([b({ id: "w", period: "week" })]);
    const backup = storage.exportBackup();
    storage.importBackup(JSON.parse(JSON.stringify(backup)));
    expect(storage.getBudgets()[0].period).toBe("week");
    expect(() => storage.importBackup({ ...backup, budgets: [b({ period: "year" })] })).toThrow(storage.InvalidBackupError);
  });
});
