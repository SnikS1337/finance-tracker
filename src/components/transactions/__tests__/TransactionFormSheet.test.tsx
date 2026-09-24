import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TransactionFormSheet } from "../TransactionFormSheet";
import { subDays, toDateKey, todayKey } from "../../../lib/date-utils";
import type { Category, Transaction } from "../../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const categories: Category[] = [
  { id: "food", name: "Еда", icon: "🍜", color: "#f97316", type: "expense", createdAt: "" },
  { id: "salary", name: "Зарплата", icon: "💼", color: "#22c55e", type: "income", createdAt: "" },
];

const existing: Transaction = {
  id: "t1",
  type: "expense",
  amount: 45_000,
  categoryId: "food",
  date: "2026-09-01",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.clear();
  // A known cached rate, and no network.
  window.localStorage.setItem("pft:exchangeRate:vndToRub", JSON.stringify({ rate: 0.004, fetchedAt: new Date().toISOString() }));
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));
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
  vi.unstubAllGlobals();
});

function render(props: Partial<Parameters<typeof TransactionFormSheet>[0]> = {}) {
  const onSubmit = vi.fn();
  const onRepeat = vi.fn();
  act(() => {
    root.render(
      <TransactionFormSheet
        open
        onOpenChange={() => {}}
        categories={categories}
        onSubmit={onSubmit}
        onRepeat={onRepeat}
        {...props}
      />
    );
  });
  return { onSubmit, onRepeat };
}

const q = <T extends Element>(sel: string) => document.body.querySelector<T>(sel);
const buttonByText = (text: string) =>
  [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text) ?? null;

function typeAmount(value: string) {
  const input = q<HTMLInputElement>("#amount")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(el: Element | null) {
  if (!el) throw new Error("not found");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("TransactionFormSheet", () => {
  it("shows a live rouble equivalent under the amount", () => {
    render();
    const hint = () => q<HTMLInputElement>("#amount")!.parentElement!.nextElementSibling!.textContent;
    expect(hint()).toBe("");
    typeAmount("250000");
    expect(hint()).toContain("1 000 ₽");
  });

  it("'Yesterday' and 'Today' chips set the date", () => {
    const { onSubmit } = render();
    typeAmount("1000");
    click(q('[role="radio"]'));
    click(buttonByText("Вчера"));
    expect(q<HTMLInputElement>("#date")!.value).toBe(toDateKey(subDays(new Date(), 1)));
    click(buttonByText("Сегодня"));
    expect(q<HTMLInputElement>("#date")!.value).toBe(todayKey());

    click(buttonByText("Добавить расход"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: "expense", amount: 1000, categoryId: "food", date: todayKey() });
  });

  it("'Repeat today' adds the same operation dated today (edit mode only)", () => {
    const { onRepeat, onSubmit } = render({ transaction: existing });
    click(buttonByText("Повторить сегодня"));
    expect(onRepeat).toHaveBeenCalledTimes(1);
    expect(onRepeat.mock.calls[0][0]).toMatchObject({ type: "expense", amount: 45_000, categoryId: "food", date: todayKey() });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves a trimmed note, and no note when left empty", () => {
    const { onSubmit } = render();
    typeAmount("1000");
    click(q('[role="radio"]'));
    const note = q<HTMLInputElement>("#note")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(note, "  обед с коллегами  ");
      note.dispatchEvent(new Event("input", { bubbles: true }));
    });
    click(buttonByText("Добавить расход"));
    expect(onSubmit.mock.calls[0][0].note).toBe("обед с коллегами");
    expect(onSubmit.mock.calls[0][1]).toMatchObject({ repeatMonthly: false });
  });

  it("passes 'repeat every month' through when ticked", () => {
    const { onSubmit } = render();
    typeAmount("5000000");
    click(q('[role="radio"]'));
    click(q('input[type="checkbox"]'));
    click(buttonByText("Добавить расход"));
    expect(onSubmit.mock.calls[0][1]).toMatchObject({ repeatMonthly: true });
  });

  it("has no repeat button when adding", () => {
    render();
    expect(buttonByText("Повторить сегодня")).toBeNull();
  });
});
