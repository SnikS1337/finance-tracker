import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../App";
import { todayKey } from "../../lib/date-utils";
import { DEFAULT_CATEGORIES } from "../../lib/seed";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The category filter must show what is actually being filtered. */

let container: HTMLDivElement;
let root: Root;
const archived = DEFAULT_CATEGORIES.find((c) => c.type === "expense")!;

beforeEach(() => {
  localStorage.clear();
  const now = new Date().toISOString();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem(
    "pft:categories",
    JSON.stringify(DEFAULT_CATEGORIES.map((c) => (c.id === archived.id ? { ...c, isArchived: true } : c)))
  );
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify([
      { id: "t1", type: "expense", amount: 1000, categoryId: archived.id, date: todayKey(), createdAt: now, updatedAt: now },
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

async function renderAt(hash: string) {
  window.location.hash = hash;
  await act(async () => {
    root.render(<App />);
  });
  const started = Date.now();
  while (!container.querySelector("main select") && Date.now() - started < 3000) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
}

function categorySelect(): HTMLSelectElement {
  // [type, category, sort]
  return container.querySelectorAll<HTMLSelectElement>("main select")[1];
}

describe("Transactions category filter", () => {
  it("shows an archived category when it is the one being filtered on", async () => {
    await renderAt(`#/transactions?category=${archived.id}`);
    const select = categorySelect();
    expect(select.value).toBe(archived.id);
    const option = [...select.options].find((o) => o.value === archived.id);
    expect(option).toBeDefined();
    // The archived category's transaction is listed.
    expect(container.textContent?.includes(archived.name)).toBe(true);
  });

  it("keeps archived categories out of the list otherwise", async () => {
    await renderAt("#/transactions");
    const select = categorySelect();
    expect(select.value).toBe("all");
    expect([...select.options].some((o) => o.value === archived.id)).toBe(false);
  });

  it("ignores a filter pointing at a category that no longer exists", async () => {
    await renderAt("#/transactions?category=deleted-category");
    expect(categorySelect().value).toBe("all");
    expect(container.textContent?.includes(archived.name)).toBe(true);
  });
});
