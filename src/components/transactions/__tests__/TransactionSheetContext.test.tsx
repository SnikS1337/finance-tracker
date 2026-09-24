import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TransactionSheetProvider } from "../TransactionSheetContext";
import { useTransactionSheet, useTransactionSheetActions } from "../../../hooks/useTransactionSheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Opening the sheet must not re-render pages that only open it. */

let container: HTMLDivElement;
let root: Root;
let pageRenders = 0;
let openAdd: (() => void) | null = null;

function Page() {
  pageRenders++;
  const actions = useTransactionSheetActions();
  useEffect(() => {
    openAdd = actions.openAdd;
  }, [actions]);
  return null;
}

function SheetHost() {
  const { state } = useTransactionSheet();
  return <span data-testid="sheet">{state.open ? "open" : "closed"}</span>;
}

beforeEach(() => {
  pageRenders = 0;
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

describe("TransactionSheetProvider", () => {
  it("opens the sheet without re-rendering components that only use the actions", () => {
    act(() => {
      root.render(
        <TransactionSheetProvider>
          <Page />
          <SheetHost />
        </TransactionSheetProvider>
      );
    });
    expect(container.textContent).toBe("closed");
    const rendersBefore = pageRenders;
    const firstOpenAdd = openAdd;

    act(() => openAdd!());

    expect(container.textContent).toBe("open");
    expect(pageRenders).toBe(rendersBefore);
    expect(openAdd).toBe(firstOpenAdd);
  });
});
