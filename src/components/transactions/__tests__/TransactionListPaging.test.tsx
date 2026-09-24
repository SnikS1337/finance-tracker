import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TransactionList, LIST_PAGE_SIZE } from "../TransactionList";
import type { Category, Transaction } from "../../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Regression: thousands of rows were rendered at once (seconds on a phone). */

const category: Category = { id: "c", name: "Кафе", icon: "☕", color: "#f97316", type: "expense", createdAt: "" };
const tx = (i: number, date: string, amount = 1000): Transaction => ({
  id: `t${i}`,
  type: "expense",
  amount,
  categoryId: "c",
  date,
  createdAt: "",
  updatedAt: "",
});

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (transactions: Transaction[], resetKey = "a") =>
  act(() => root.render(<TransactionList transactions={transactions} categories={[category]} onSelect={() => {}} resetKey={resetKey} />));
const rows = () => container.querySelectorAll("button[data-swiping]").length;
const moreButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Показать ещё"));

// 250 operations over 25 days, 10 per day.
const many = Array.from({ length: 250 }, (_, i) => tx(i, `2026-09-${String(25 - Math.floor(i / 10)).padStart(2, "0")}`));

describe("TransactionList paging", () => {
  it("renders the first page and offers the rest", () => {
    render(many);
    expect(rows()).toBe(LIST_PAGE_SIZE);
    expect(moreButton()?.textContent).toContain("осталось 150");
    act(() => moreButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(rows()).toBe(2 * LIST_PAGE_SIZE);
    act(() => moreButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(rows()).toBe(250);
    expect(moreButton()).toBeUndefined();
  });

  it("starts from the first page again when the filter changes", () => {
    render(many, "month");
    act(() => moreButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(rows()).toBe(200);
    render(many, "year");
    expect(rows()).toBe(LIST_PAGE_SIZE);
  });

  it("a day cut by the page boundary still shows the whole day's total", () => {
    const day = Array.from({ length: 105 }, (_, i) => tx(i, "2026-09-10", 1000));
    render(day);
    expect(rows()).toBe(LIST_PAGE_SIZE);
    expect(container.textContent?.replace(/\s/g, "")).toContain("-105000₫");
  });

  it("keeps the order of days from the sorted list (oldest first stays oldest first)", () => {
    render([tx(1, "2026-09-01"), tx(2, "2026-09-02"), tx(3, "2026-09-03")]);
    const headers = [...container.querySelectorAll("[data-day-group] h3")].map((h) => h.textContent);
    expect(headers[0]).toContain("1 сент");
    expect(headers[2]).toContain("3 сент");
  });
});
