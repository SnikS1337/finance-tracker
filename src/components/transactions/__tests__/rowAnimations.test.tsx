import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TransactionList } from "../TransactionList";
import { rowMotion } from "../rowMotion";
import type { Category, Transaction } from "../../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Row animations with a fake Web Animations API: deleted rows fold away before
 * they're removed, restored rows unfold, new rows glow, and the swipe gives a
 * haptic tick where navigator.vibrate exists.
 */

const category: Category = { id: "c", name: "Кафе", icon: "☕", color: "#f97316", type: "expense", createdAt: "" };
const tx = (id: string, date = "2026-01-15"): Transaction => ({
  id,
  type: "expense",
  amount: 45_000,
  categoryId: "c",
  date,
  createdAt: "",
  updatedAt: "",
});

interface FakeAnimation {
  el: Element;
  keyframes: Keyframe[];
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
  cancel: () => void;
}

let animations: FakeAnimation[];
let container: HTMLDivElement;
let root: Root;
const originalAnimate = (HTMLElement.prototype as { animate?: unknown }).animate;

beforeEach(() => {
  rowMotion.resetForTests();
  animations = [];
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = function (this: Element, keyframes: Keyframe[]) {
    const anim: FakeAnimation = { el: this, keyframes, onfinish: null, oncancel: null, cancel: () => {} };
    animations.push(anim);
    return anim;
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = originalAnimate;
  delete (navigator as { vibrate?: unknown }).vibrate;
});

function render(transactions: Transaction[], onDelete = vi.fn()) {
  act(() => {
    root.render(<TransactionList transactions={transactions} categories={[category]} onSelect={() => {}} onDelete={onDelete} />);
  });
  return onDelete;
}

function touch(el: Element, type: "touchstart" | "touchmove" | "touchend", x: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: 100, identifier: 0, target: el };
  Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [point] });
  act(() => {
    el.dispatchEvent(event);
  });
}

const rows = () => Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-swiping]"));
const finish = (a: FakeAnimation) => act(() => a.onfinish?.());
const foldsToZero = (a: FakeAnimation) => a.keyframes[a.keyframes.length - 1]?.height === "0px";
const unfoldsFromZero = (a: FakeAnimation) => a.keyframes[0]?.height === "0px";

describe("row animations", () => {
  it("a swiped row folds away first, and is deleted when the fold ends", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true, writable: true });
    const onDelete = render([tx("a"), tx("b")]);
    const [row] = rows();

    touch(row, "touchstart", 300);
    touch(row, "touchmove", 280);
    touch(row, "touchmove", 200);
    expect(vibrate).toHaveBeenCalledWith(8); // crossed the delete threshold
    touch(row, "touchend", 200);
    expect(vibrate).toHaveBeenCalledWith(15); // released to delete

    finish(animations[animations.length - 1]); // settle
    const fold = animations[animations.length - 1];
    expect(foldsToZero(fold)).toBe(true);
    expect(fold.el.hasAttribute("data-day-group")).toBe(false); // other rows remain that day
    expect(onDelete).not.toHaveBeenCalled();

    finish(fold);
    expect(onDelete).toHaveBeenCalledWith(tx("a"));
  });

  it("the day's only row folds the whole day group", () => {
    render([tx("a", "2026-01-15"), tx("b", "2026-01-14")]);
    const [row] = rows();
    touch(row, "touchstart", 300);
    touch(row, "touchmove", 200);
    touch(row, "touchend", 200);
    finish(animations[animations.length - 1]);
    expect(animations[animations.length - 1].el.hasAttribute("data-day-group")).toBe(true);
  });

  it("works without navigator.vibrate (iOS Safari)", () => {
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true, writable: true });
    const onDelete = render([tx("a")]);
    const [row] = rows();
    touch(row, "touchstart", 300);
    touch(row, "touchmove", 200);
    touch(row, "touchend", 200);
    finish(animations[animations.length - 1]);
    finish(animations[animations.length - 1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("a row brought back with 'Отменить' unfolds into place, once", () => {
    const onDelete = render([tx("a"), tx("b")]);
    const [row] = rows();
    touch(row, "touchstart", 300);
    touch(row, "touchmove", 200);
    touch(row, "touchend", 200);
    finish(animations[animations.length - 1]);
    finish(animations[animations.length - 1]);
    expect(onDelete).toHaveBeenCalledTimes(1);

    render([tx("b")]); // deleted
    animations = [];
    render([tx("a"), tx("b")]); // restored
    expect(animations.some(unfoldsFromZero)).toBe(true);

    animations = [];
    render([tx("b")]);
    render([tx("a"), tx("b")]);
    expect(animations.some(unfoldsFromZero)).toBe(false);
  });

  it("a just-added operation glows briefly", () => {
    rowMotion.markAdded("new");
    render([tx("new"), tx("old")]);
    const glows = animations.filter((a) => a.keyframes[0]?.opacity === 1 && a.keyframes.length === 3);
    expect(glows).toHaveLength(1);
  });

  it("without the Web Animations API a delete happens immediately", () => {
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = undefined;
    const onDelete = render([tx("a")]);
    const [row] = rows();
    touch(row, "touchstart", 300);
    touch(row, "touchmove", 200);
    touch(row, "touchend", 200);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
