import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ToastProvider } from "../Toast";
import { useToast } from "../../../hooks/useToast";
import type { ToastContextValue } from "../toastStore";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let api: ToastContextValue;

function Grab() {
  api = useToast();
  return null;
}

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(
      <ToastProvider>
        <Grab />
      </ToastProvider>
    );
  });
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("passive toasts", () => {
  it("don't push an undo toast off the screen", () => {
    mount();
    act(() => api.showToast({ message: "Операция удалена", actionLabel: "Отменить", onAction: () => {} }));
    act(() => api.showToast({ message: "Добавлены регулярные операции: 1", passive: true }));
    expect(container.textContent).toContain("Операция удалена");
    expect(container.textContent).not.toContain("регулярные");
  });

  it("are shown otherwise", () => {
    mount();
    act(() => api.showToast({ message: "Расход добавлен" }));
    act(() => api.showToast({ message: "Добавлены регулярные операции: 1", passive: true }));
    expect(container.textContent).toContain("регулярные");
  });
});
