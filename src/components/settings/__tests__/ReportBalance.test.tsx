import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ToastProvider } from "../../ui/Toast";
import { AppDataProvider } from "../../../context/AppDataContext";
import { ReportGenerator } from "../ReportGenerator";
import { todayKey } from "../../../lib/date-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** PNG report: the balance is as prominent as income/expenses and coloured by sign, like in the app. */

let container: HTMLDivElement;
let root: Root;

function seed(amounts: Array<[type: "income" | "expense", amount: number]>) {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
  localStorage.setItem("pft:settings", JSON.stringify({ theme: "light", onboarded: true, isDemoData: false }));
  localStorage.setItem(
    "pft:transactions",
    JSON.stringify(
      amounts.map(([type, amount], i) => ({
        id: `t${i}`,
        type,
        amount,
        categoryId: type === "income" ? "inc-salary" : "exp-food",
        date: todayKey(),
        createdAt: "",
        updatedAt: "",
      }))
    )
  );
}

beforeEach(() => {
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

function balanceClass() {
  act(() =>
    root.render(
      <ToastProvider>
        <AppDataProvider>
          <ReportGenerator />
        </AppDataProvider>
      </ToastProvider>
    )
  );
  const label = [...container.querySelectorAll("p")].find((p) => p.textContent === "Баланс")!;
  return (label.nextElementSibling as HTMLElement).className;
}

describe("PNG report balance", () => {
  it("is red when negative, the same size as expenses", () => {
    seed([["expense", 1_518_000]]);
    const cls = balanceClass();
    expect(cls).toContain("text-red-500");
    expect(cls).toContain("text-lg");
  });

  it("is green when positive", () => {
    seed([["income", 3_000_000], ["expense", 1_000_000]]);
    expect(balanceClass()).toContain("text-emerald-500");
  });
});
