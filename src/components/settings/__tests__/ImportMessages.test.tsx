import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ToastProvider } from "../../ui/Toast";
import { AppDataProvider } from "../../../context/AppDataContext";
import { DataSettings } from "../DataSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Regression: importing a file that isn't JSON showed the raw English SyntaxError. */

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
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
  vi.unstubAllGlobals();
});

describe("import messages", () => {
  it("a file that isn't JSON gets a plain Russian message and changes nothing", async () => {
    act(() =>
      root.render(
        <ToastProvider>
          <AppDataProvider>
            <DataSettings />
          </AppDataProvider>
        </ToastProvider>
      )
    );
    const before = localStorage.getItem("pft:transactions");
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["{ not json"], "backup.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent === "Импортировать и заменить")!;
    await act(async () => {
      confirm.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(container.textContent).toContain("Этот файл не похож на корректную резервную копию.");
    expect(container.textContent).not.toMatch(/Unexpected|SyntaxError|is not valid/);
    expect(localStorage.getItem("pft:transactions")).toBe(before);
  });
});
