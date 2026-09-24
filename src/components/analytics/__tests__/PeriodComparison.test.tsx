import { describe, it, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PeriodComparison } from "../PeriodComparison";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PeriodComparison", () => {
  it("shows one row per figure, amounts on a single line", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() =>
      root.render(
        <PeriodComparison currentLabel="1–24 сент." previousLabel="1–24 авг." current={678_688_003_678} previous={0} percentageChange={null} />
      )
    );
    const amounts = [...container.querySelectorAll("span.whitespace-nowrap")].map((el) => el.textContent);
    expect(amounts).toHaveLength(3);
    expect(amounts[2]).toMatch(/^\+678\s688\s003\s678\u00A0₫$/);
    act(() => root.unmount());
  });
});
