import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../../../App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * When the browser refuses to save (storage full, blocked), the user is told,
 * nothing changes, and the form keeps what was typed.
 */

let container: HTMLDivElement;
let root: Root;
const proto = Object.getPrototypeOf(window.localStorage) as Storage;
const originalSetItem = proto.setItem;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
  window.location.hash = "#/";
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  proto.setItem = originalSetItem;
  act(() => root.unmount());
  container.remove();
  window.location.hash = "";
  vi.unstubAllGlobals();
});

/** From now on every write of operations fails like a full storage. */
function failTransactionWrites() {
  proto.setItem = function (this: Storage, key: string, value: string) {
    if (key === "pft:transactions") throw new DOMException("quota", "QuotaExceededError");
    return originalSetItem.call(this, key, value);
  };
}

const q = <T extends Element>(sel: string) => document.body.querySelector<T>(sel);
const byText = (text: string) =>
  [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text) ?? null;

async function click(el: Element | null) {
  if (!el) throw new Error("not found");
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("save errors", () => {
  it("adding an operation when storage is full: message, nothing saved, form keeps the input", async () => {
    await act(async () => {
      root.render(<App />);
    });
    await click(q('button[aria-label="Добавить операцию"]'));
    const amount = q<HTMLInputElement>("#amount")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(amount, "45000");
      amount.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(q('[role="radio"]'));

    failTransactionWrites();
    // React reports errors thrown from event handlers; that's expected here.
    const onError = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener("error", onError);
    try {
      await click(byText("Добавить расход"));
    } finally {
      window.removeEventListener("error", onError);
    }

    expect(document.body.textContent).toContain("Хранилище переполнено");
    expect(document.body.textContent).not.toContain("Расход добавлен");
    expect(q<HTMLInputElement>("#amount")?.value).toMatch(/^45\s000$/); // form still open, input kept
    expect(JSON.parse(localStorage.getItem("pft:transactions") ?? "[]")).toEqual([]);
  });
});
