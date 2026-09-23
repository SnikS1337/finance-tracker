import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TransactionList } from "../TransactionList";
import { swipeOffsetForDrag, DELETE_THRESHOLD } from "../swipePhysics";
import type { Category, Transaction } from "../../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Swipe-to-delete, driven with synthetic touch events. jsdom has no Web
 * Animations API (`element.animate`), so release animations resolve
 * immediately to their final state — exactly what these tests assert on.
 */

const category: Category = {
  id: "cat-1",
  name: "Кафе",
  icon: "☕",
  color: "#f97316",
  type: "expense",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const first: Transaction = {
  id: "tx-1",
  type: "expense",
  amount: 45_000,
  categoryId: "cat-1",
  date: "2026-01-15",
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

const second: Transaction = {
  ...first,
  id: "tx-2",
  amount: 120_000,
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

function render(onSelect = vi.fn(), onDelete = vi.fn(), transactions: Transaction[] = [first, second]) {
  act(() => {
    root.render(
      <TransactionList transactions={transactions} categories={[category]} onSelect={onSelect} onDelete={onDelete} />
    );
  });
  return { onSelect, onDelete };
}

/** Row-content buttons (each row also has a desktop delete button after it). */
function rowButtons(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-swiping]"));
}

function touch(el: Element, type: "touchstart" | "touchmove" | "touchend", x: number, y = 100) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y, identifier: 0, target: el };
  Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [point] });
  Object.defineProperty(event, "changedTouches", { value: [point] });
  act(() => {
    el.dispatchEvent(event);
  });
}

/** Drags from x=300 through each finger position (relative travel), without releasing. */
function drag(el: Element, travels: number[], y = 100) {
  touch(el, "touchstart", 300, y);
  for (const dx of travels) touch(el, "touchmove", 300 + dx, y);
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function translateX(el: HTMLElement): number {
  const match = el.style.transform.match(/translate3d\((-?[\d.]+)px/);
  return match ? parseFloat(match[1]) : 0;
}

describe("swipeOffsetForDrag (drag physics)", () => {
  it("follows the finger 1:1 up to the delete threshold — no rubber band before it", () => {
    expect(swipeOffsetForDrag(0)).toBe(0);
    expect(swipeOffsetForDrag(-20)).toBe(-20);
    expect(swipeOffsetForDrag(-40)).toBe(-40);
    expect(swipeOffsetForDrag(-60)).toBe(-60);
    expect(swipeOffsetForDrag(-DELETE_THRESHOLD)).toBe(-DELETE_THRESHOLD);
  });

  it("adds gradually increasing resistance past the threshold, but keeps moving", () => {
    const a = swipeOffsetForDrag(-(DELETE_THRESHOLD + 10));
    const b = swipeOffsetForDrag(-(DELETE_THRESHOLD + 30));
    const c = swipeOffsetForDrag(-(DELETE_THRESHOLD + 120));
    // Still moves further left…
    expect(a).toBeLessThan(-DELETE_THRESHOLD);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
    // …but by less than the finger did, and less and less per pixel.
    expect(-DELETE_THRESHOLD - a).toBeLessThan(10);
    const pxPerFingerPxEarly = (-DELETE_THRESHOLD - a) / 10;
    const pxPerFingerPxLater = (a - b) / 20;
    expect(pxPerFingerPxLater).toBeLessThan(pxPerFingerPxEarly);
    // Bounded: the row can never be dragged far away.
    expect(c).toBeGreaterThan(-(DELETE_THRESHOLD + 28));
  });

  it("ignores rightward drags", () => {
    expect(swipeOffsetForDrag(40)).toBe(0);
  });
});

describe("TransactionList — swipe to delete", () => {
  it("moves the row directly with the finger while dragging", () => {
    render();
    const [row] = rowButtons();

    drag(row, [-20]);
    expect(translateX(row)).toBe(-20);
    touch(row, "touchmove", 300 - 40);
    expect(translateX(row)).toBe(-40);
    touch(row, "touchmove", 300 - 60);
    expect(translateX(row)).toBe(-60);
    expect(row.dataset.swiping).toBe("true");
  });

  it("marks the row as armed once past the threshold", () => {
    render();
    const [row] = rowButtons();

    drag(row, [-40]);
    expect(row.dataset.armed).toBe("false");
    touch(row, "touchmove", 300 - 90);
    expect(row.dataset.armed).toBe("true");
    expect(translateX(row)).toBeLessThan(-DELETE_THRESHOLD);
    expect(translateX(row)).toBeGreaterThan(-90);
  });

  it("a swipe below the threshold returns the row and deletes nothing", () => {
    const { onDelete } = render();
    const [row] = rowButtons();

    drag(row, [-20, -50]);
    touch(row, "touchend", 300 - 50);

    expect(onDelete).not.toHaveBeenCalled();
    expect(translateX(row)).toBe(0);
    expect(row.dataset.swiping).toBe("false");
  });

  it("a swipe past the threshold deletes exactly that transaction, once", () => {
    const { onDelete } = render();
    const [, secondRow] = rowButtons();

    drag(secondRow, [-30, -60, -95]);
    touch(secondRow, "touchend", 300 - 95);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(second);
    expect(onDelete).not.toHaveBeenCalledWith(first);
  });

  it("the click synthesized after a swipe does not open the transaction", () => {
    const { onSelect } = render();
    const [row] = rowButtons();

    drag(row, [-50]);
    touch(row, "touchend", 300 - 50);
    click(row);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("the click after a deleting swipe does not open the transaction either", () => {
    const { onSelect, onDelete } = render();
    const [row] = rowButtons();

    drag(row, [-100]);
    touch(row, "touchend", 300 - 100);
    click(row);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("a plain tap after an earlier swipe still opens the transaction", () => {
    const { onSelect } = render();
    const [row] = rowButtons();

    // Swipe that the browser doesn't follow with a click…
    drag(row, [-50]);
    touch(row, "touchend", 300 - 50);
    // …then a normal tap.
    touch(row, "touchstart", 200);
    touch(row, "touchend", 200);
    click(row);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(first);
  });

  it("a vertical scroll gesture doesn't move the row", () => {
    const { onDelete } = render();
    const [row] = rowButtons();

    touch(row, "touchstart", 300, 100);
    touch(row, "touchmove", 297, 140);
    touch(row, "touchmove", 240, 180);
    touch(row, "touchend", 240, 180);

    expect(translateX(row)).toBe(0);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps the delete zone hidden at rest (nothing to bleed through around the row)", () => {
    render();
    const [row] = rowButtons();
    expect(row.dataset.swiping).toBe("false");
    expect(row.style.transform).toBe("");
  });
});
