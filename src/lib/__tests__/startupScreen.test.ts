import { describe, it, expect } from "vitest";
import { hideStartupScreen } from "../startupScreen";

describe("hideStartupScreen", () => {
  it("fades the static startup screen out and then removes it", async () => {
    const el = document.createElement("div");
    el.id = "startup";
    document.body.appendChild(el);

    hideStartupScreen();
    // Fade starts immediately (no requestAnimationFrame, which never fires in background tabs)…
    expect(el.classList.contains("startup--hide")).toBe(true);
    expect(document.getElementById("startup")).not.toBeNull();

    // …and the node is gone once the fade has finished.
    await new Promise((r) => setTimeout(r, 400));
    expect(document.getElementById("startup")).toBeNull();
  });

  it("is a no-op when called again (e.g. StrictMode double effects)", () => {
    expect(() => hideStartupScreen()).not.toThrow();
  });
});
