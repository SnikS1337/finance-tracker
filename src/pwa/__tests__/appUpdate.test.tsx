import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { UpdateBanner } from "../../components/layout/UpdateBanner";
import { applyAppUpdate, markUpdateAvailable, resetAppUpdateForTests } from "../appUpdate";
import { useTheme } from "../../hooks/useTheme";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    resetAppUpdateForTests();
  });
  container.remove();
});

const button = (text: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text || b.getAttribute("aria-label") === text);

describe("update banner", () => {
  it("appears only once a new version is waiting", () => {
    act(() => root.render(<UpdateBanner />));
    expect(container.textContent).toBe("");
    act(() => markUpdateAvailable(() => {}));
    expect(container.textContent).toContain("Доступна новая версия");
  });

  it("'Обновить' activates the waiting version", async () => {
    const apply = vi.fn();
    act(() => root.render(<UpdateBanner />));
    act(() => markUpdateAvailable(apply));
    await act(async () => {
      button("Обновить")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(button("Обновить")!.disabled).toBe(true);
  });

  it("can be hidden for now", () => {
    act(() => root.render(<UpdateBanner />));
    act(() => markUpdateAvailable(() => {}));
    act(() => button("Позже")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).toBe("");
  });

  it("reloads right away if activating fails", async () => {
    const reload = vi.fn();
    markUpdateAvailable(() => Promise.reject(new Error("no waiting worker")));
    await applyAppUpdate(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("theme-color", () => {
  it("follows the in-app theme", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
    // jsdom has no matchMedia.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    function Probe({ theme }: { theme: "light" | "dark" }) {
      useTheme(theme);
      return null;
    }
    act(() => root.render(<Probe theme="dark" />));
    expect(meta.getAttribute("content")).toBe("#14161a");
    act(() => root.render(<Probe theme="light" />));
    expect(meta.getAttribute("content")).toBe("#f7f8fa");
    meta.remove();
    window.matchMedia = originalMatchMedia;
  });
});
