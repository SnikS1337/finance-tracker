import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useToday } from "../useToday";
import { getPresetRange, toDateKey } from "../../lib/date-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Presets must follow the calendar when the app stays open across midnight. */

const RealDate = Date;
let fakeNow = new RealDate(2026, 8, 30, 23, 59).getTime();

class FakeDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(fakeNow);
    else super(...(args as [number]));
  }
  static now() {
    return fakeNow;
  }
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  fakeNow = new RealDate(2026, 8, 30, 23, 59).getTime();
  vi.stubGlobal("Date", FakeDate);
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

function Probe() {
  return <span>{useToday()}</span>;
}

describe("useToday", () => {
  it("updates when the app comes back after midnight", () => {
    act(() => {
      root.render(<Probe />);
    });
    expect(container.textContent).toBe("2026-09-30");

    fakeNow = new RealDate(2026, 9, 1, 8, 0).getTime();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(container.textContent).toBe("2026-10-01");
  });
});

describe("getPresetRange with an explicit 'now'", () => {
  it("rolls 'This month' over to the new month", () => {
    const before = getPresetRange("thisMonth", undefined, undefined, new RealDate(2026, 8, 30));
    const after = getPresetRange("thisMonth", undefined, undefined, new RealDate(2026, 9, 1));
    expect([toDateKey(before.start), toDateKey(before.end)]).toEqual(["2026-09-01", "2026-09-30"]);
    expect([toDateKey(after.start), toDateKey(after.end)]).toEqual(["2026-10-01", "2026-10-31"]);
  });

  it("'Today' follows the given day", () => {
    const r = getPresetRange("today", undefined, undefined, new RealDate(2026, 9, 1, 15));
    expect(toDateKey(r.start)).toBe("2026-10-01");
    expect(toDateKey(r.end)).toBe("2026-10-01");
  });
});
