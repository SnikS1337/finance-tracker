import { describe, it, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AboutSettings } from "../AboutSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("About section", () => {
  it("is collapsed to a single line with the version, and unfolds on tap", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<AboutSettings />));
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="about-body"]')!;
    const body = container.querySelector("#about-body")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("Версия");
    expect(body.hasAttribute("inert")).toBe(true);
    act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(body.hasAttribute("inert")).toBe(false);
    act(() => root.unmount());
  });
});
