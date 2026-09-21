import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TransactionList } from "../TransactionList";
import type { Category, Transaction } from "../../../types";

// Lets React's `act()` know this is an intentional test environment (we're
// using react-dom directly, not a testing-library wrapper that sets this
// itself), so it stops warning on every act() call.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * These render with react-dom directly (no @testing-library/react — not a
 * project dependency, and not worth adding for this). jsdom doesn't
 * implement `window.matchMedia`, so `TransactionList`'s pointer-type check
 * naturally resolves to "not touch-primary", exercising exactly the desktop
 * hover-delete row these tests care about.
 */

const category: Category = {
  id: "cat-1",
  name: "Кафе",
  icon: "☕",
  color: "#f97316",
  type: "expense",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const transaction: Transaction = {
  id: "tx-1",
  type: "expense",
  amount: 45_000,
  categoryId: "cat-1",
  date: "2026-01-15",
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

// A second, distinct transaction on the same day (so it shares a row group
// with `transaction`) — used to prove a delete acts on the *specific*
// transaction whose button was pressed, not just "whichever one exists".
const otherTransaction: Transaction = {
  id: "tx-2",
  type: "expense",
  amount: 120_000,
  categoryId: "cat-1",
  date: "2026-01-15",
  createdAt: "2026-01-15T00:01:00.000Z",
  updatedAt: "2026-01-15T00:01:00.000Z",
};

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
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(
  onSelect: (tx: Transaction) => void,
  onDelete: (tx: Transaction) => void,
  transactions: Transaction[] = [transaction]
) {
  act(() => {
    root.render(
      <TransactionList transactions={transactions} categories={[category]} onSelect={onSelect} onDelete={onDelete} />
    );
  });
}

function click(el: Element | null) {
  if (!el) throw new Error("Element not found");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

/**
 * Simulates a real browser activating a focused native <button> via the
 * keyboard. jsdom does not itself translate a dispatched Enter/Space
 * keydown into a click for form controls (unlike a real browser, which does
 * this as part of the HTML spec's default action for <button> elements) —
 * so the keydown is dispatched for documentation/parity with real keyboard
 * use, and the resulting click that a real browser would fire is dispatched
 * directly. This is a faithful stand-in *only* because the element under
 * test is asserted to be a genuine, enabled <button> first: that fact is
 * exactly what guarantees a real browser performs this translation with no
 * application code involved (the entire point of using real <button>s
 * instead of a `div[role="button"]` with manual onKeyDown handling).
 */
function pressKey(el: Element | null, key: "Enter" | " ") {
  if (!el) throw new Error("Element not found");
  expect(el.tagName).toBe("BUTTON");
  expect((el as HTMLButtonElement).disabled).toBe(false);
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function getConfirmDialog() {
  return document.body.querySelector('[role="alertdialog"], [role="dialog"]');
}

describe("TransactionList — desktop delete semantics", () => {
  it("uses two sibling buttons, not a button nested inside another button", () => {
    render(vi.fn(), vi.fn());
    // The bug this replaces: <div role="button"><button>Trash</button></div>.
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.querySelector("button button")).toBeNull();

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].tagName).toBe("BUTTON");
    expect(buttons[1].tagName).toBe("BUTTON");
  });

  it("clicking the row content opens edit", () => {
    const onSelect = vi.fn();
    render(onSelect, vi.fn());

    const [rowButton] = container.querySelectorAll("button");
    click(rowButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("clicking the delete button does not open edit, and opens the confirm dialog", () => {
    const onSelect = vi.fn();
    render(onSelect, vi.fn());

    const [, deleteButton] = container.querySelectorAll("button");
    click(deleteButton);

    expect(onSelect).not.toHaveBeenCalled();
    // ConfirmDialog renders into a portal (document.body), not `container`.
    expect(getConfirmDialog()).not.toBeNull();
  });

  it("confirming the dialog calls onDelete with the exact transaction that was deleted, not just any/the-only one", () => {
    const onDelete = vi.fn();
    // Two transactions in the same row group — deleting the second one must
    // resolve to *that* transaction object, proving the identity that flows
    // through is the one whose button was actually pressed.
    render(vi.fn(), onDelete, [transaction, otherTransaction]);

    const rows = container.querySelectorAll("button");
    // [row1-content, row1-delete, row2-content, row2-delete]
    const secondRowDeleteButton = rows[3];
    click(secondRowDeleteButton);

    const dialog = getConfirmDialog();
    const confirmButton = dialog?.querySelectorAll("button")[1]; // [Cancel, Confirm]
    click(confirmButton ?? null);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(otherTransaction);
    expect(onDelete).not.toHaveBeenCalledWith(transaction);
  });

  it("Enter on the row-content button opens edit (native <button> keyboard activation)", () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(onSelect, onDelete);

    const [rowButton] = container.querySelectorAll("button");
    pressKey(rowButton, "Enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(transaction);
    expect(onDelete).not.toHaveBeenCalled();
    expect(getConfirmDialog()).toBeNull();
  });

  it("Enter on the delete button does not open edit, and opens the confirm dialog", () => {
    const onSelect = vi.fn();
    render(onSelect, vi.fn());

    const [, deleteButton] = container.querySelectorAll("button");
    pressKey(deleteButton, "Enter");

    expect(onSelect).not.toHaveBeenCalled();
    expect(getConfirmDialog()).not.toBeNull();
  });

  it("Space on the delete button does not open edit, and opens the confirm dialog", () => {
    const onSelect = vi.fn();
    render(onSelect, vi.fn());

    const [, deleteButton] = container.querySelectorAll("button");
    pressKey(deleteButton, " ");

    expect(onSelect).not.toHaveBeenCalled();
    expect(getConfirmDialog()).not.toBeNull();
  });
});
