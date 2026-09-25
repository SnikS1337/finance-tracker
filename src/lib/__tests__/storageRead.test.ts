import { describe, it, expect, beforeEach } from "vitest";
import * as storage from "../storage";
import { DEFAULT_CATEGORIES } from "../seed";
import type { Transaction } from "../../types";

/** Whatever is in localStorage (hand-edited, half-written, old bugs) must not crash the app. */

const valid: Transaction = {
  id: "t1",
  type: "expense",
  amount: 45_000,
  categoryId: "exp-food",
  date: "2026-09-10",
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pft:schemaVersion", "1");
});

describe("reading damaged storage", () => {
  it("skips broken operations and keeps the good ones", () => {
    localStorage.setItem(
      "pft:transactions",
      JSON.stringify([null, 42, "x", { ...valid, id: "bad-amount", amount: "45000" }, { ...valid, id: "bad-date", date: "2026-13-45" }, valid])
    );
    expect(storage.getTransactions().map((t) => t.id)).toEqual(["t1"]);
  });

  it("treats a non-list or unparsable value as empty (categories fall back to the defaults)", () => {
    localStorage.setItem("pft:transactions", '{"oops":true}');
    localStorage.setItem("pft:categories", "not json at all");
    localStorage.setItem("pft:budgets", "7");
    expect(storage.getTransactions()).toEqual([]);
    expect(storage.getCategories()).toEqual(DEFAULT_CATEGORIES);
    expect(storage.getBudgets()).toEqual([]);
  });

  it("fills a missing createdAt so sorting can't crash", () => {
    const { createdAt: _drop, ...noCreated } = valid;
    void _drop;
    localStorage.setItem("pft:transactions", JSON.stringify([noCreated]));
    expect(storage.getTransactions()[0].createdAt).toBe("");
  });

  it("sanitizes settings field by field", () => {
    localStorage.setItem("pft:settings", JSON.stringify({ theme: "neon", onboarded: true, isDemoData: "yes" }));
    expect(storage.getSettings()).toEqual({ theme: "system", onboarded: true, isDemoData: false });
    localStorage.setItem("pft:settings", '"garbage"');
    expect(storage.getSettings()).toEqual({ theme: "system", onboarded: false, isDemoData: false });
  });

  it("a write after reading drops the broken entries and keeps the good ones", () => {
    localStorage.setItem("pft:transactions", JSON.stringify([null, valid]));
    storage.createTransaction({ ...valid, id: "t2" });
    expect(JSON.parse(localStorage.getItem("pft:transactions")!).map((t: { id: string }) => t.id)).toEqual(["t1", "t2"]);
  });
});
