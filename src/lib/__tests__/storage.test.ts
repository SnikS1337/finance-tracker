import { describe, it, expect, beforeEach } from "vitest";
import * as storage from "../storage";
import { MAX_AMOUNT } from "../currency";
import type { BackupData, Budget, Category, Transaction } from "../../types";

/**
 * Backup import/export and multi-key writes — the places where a bug means
 * lost or half-replaced user data.
 */

const cat = (over: Partial<Category> = {}): Category => ({
  id: "c-food",
  name: "Еда",
  icon: "🍜",
  color: "#f97316",
  type: "expense",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const txn = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t-1",
  type: "expense",
  amount: 45_000,
  categoryId: "c-food",
  date: "2026-09-10",
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
  ...over,
});

const budget = (over: Partial<Budget> = {}): Budget => ({
  id: "b-1",
  amount: 1_000_000,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

function backup(over: Partial<BackupData> = {}): BackupData {
  return {
    version: storage.SCHEMA_VERSION,
    exportedAt: "2026-09-24T00:00:00.000Z",
    transactions: [txn()],
    categories: [cat()],
    budgets: [budget({ categoryId: "c-food" })],
    settings: { theme: "dark", onboarded: true, isDemoData: false },
    ...over,
  };
}

/** Makes the n-th `localStorage.setItem` call (1-based) throw like a full quota. */
function failNthWrite(n: number, run: () => void) {
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const original = proto.setItem;
  let calls = 0;
  proto.setItem = function (this: Storage, key: string, value: string) {
    // The availability probe writes "pft:__test__"; don't count it.
    if (key !== "pft:__test__") {
      calls += 1;
      if (calls === n) throw new DOMException("quota", "QuotaExceededError");
    }
    return original.call(this, key, value);
  };
  try {
    run();
  } finally {
    proto.setItem = original;
  }
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("backup round trip", () => {
  it("exports and re-imports the same data", () => {
    storage.importBackup(backup());
    const exported = storage.exportBackup();

    window.localStorage.clear();
    storage.importBackup(JSON.parse(JSON.stringify(exported)));

    expect(storage.getTransactions()).toEqual([txn()]);
    expect(storage.getCategories()).toEqual([cat()]);
    expect(storage.getBudgets()).toEqual([budget({ categoryId: "c-food" })]);
    expect(storage.getSettings().theme).toBe("dark");
  });
});

describe("backup validation", () => {
  const rejects = (data: unknown) => expect(() => storage.importBackup(data)).toThrow();

  it("rejects non-backups and newer versions", () => {
    rejects(null);
    rejects({ hello: "world" });
    rejects(backup({ version: storage.SCHEMA_VERSION + 1 }));
  });

  it("rejects amounts that are not positive safe integers within the limit", () => {
    rejects(backup({ transactions: [txn({ amount: 0 })] }));
    rejects(backup({ transactions: [txn({ amount: 12.5 })] }));
    rejects(backup({ transactions: [txn({ amount: MAX_AMOUNT + 1 })] }));
    rejects(backup({ budgets: [budget({ amount: -1 })] }));
  });

  it("rejects impossible dates", () => {
    rejects(backup({ transactions: [txn({ date: "2026-02-30" })] }));
    rejects(backup({ transactions: [txn({ date: "10.09.2026" })] }));
  });

  it("rejects categories with a wrong type or missing colour", () => {
    rejects(backup({ categories: [cat({ type: "transfer" as Category["type"] })] }));
    rejects(backup({ categories: [{ ...cat(), color: undefined } as unknown as Category] }));
  });

  it("does not touch existing data when a backup is rejected", () => {
    storage.importBackup(backup());
    const before = window.localStorage.getItem("pft:transactions");
    rejects(backup({ transactions: [txn({ amount: -5 })] }));
    expect(window.localStorage.getItem("pft:transactions")).toBe(before);
  });

  it("falls back to safe settings for unknown values", () => {
    storage.importBackup(backup({ settings: { theme: "neon", onboarded: "yes" } as unknown as BackupData["settings"] }));
    const settings = storage.getSettings();
    expect(settings.theme).toBe("system");
    expect(settings.onboarded).toBe(true);
    expect(settings.isDemoData).toBe(false);
  });

  it("drops budgets of categories that aren't in the backup", () => {
    storage.importBackup(
      backup({ budgets: [budget({ id: "b-overall" }), budget({ id: "b-orphan", categoryId: "c-missing" })] })
    );
    expect(storage.getBudgets().map((b) => b.id)).toEqual(["b-overall"]);
  });
});

describe("all-or-nothing writes", () => {
  it("restores every key if the import fails halfway through", () => {
    storage.importBackup(backup());
    const snapshot = ["pft:transactions", "pft:categories", "pft:budgets", "pft:settings"].map((k) =>
      window.localStorage.getItem(k)
    );

    const replacement = backup({
      transactions: [txn({ id: "t-new", amount: 99 })],
      categories: [cat({ name: "Новая" })],
    });
    // 1st write (categories) succeeds, 2nd (transactions) hits a full quota.
    failNthWrite(2, () => {
      expect(() => storage.importBackup(replacement)).toThrow();
    });

    const after = ["pft:transactions", "pft:categories", "pft:budgets", "pft:settings"].map((k) =>
      window.localStorage.getItem(k)
    );
    expect(after).toEqual(snapshot);
  });

  it("clearAllData resets everything", () => {
    storage.importBackup(backup());
    storage.clearAllData();
    expect(storage.getTransactions()).toEqual([]);
    expect(storage.getBudgets()).toEqual([]);
    expect(storage.getSettings().onboarded).toBe(false);
  });
});

describe("deleting a category", () => {
  it("also deletes that category's budget, and only that one", () => {
    storage.importBackup(
      backup({
        categories: [cat(), cat({ id: "c-taxi", name: "Такси" })],
        budgets: [
          budget({ id: "b-food", categoryId: "c-food" }),
          budget({ id: "b-taxi", categoryId: "c-taxi" }),
          budget({ id: "b-overall" }),
        ],
      })
    );

    storage.deleteCategory("c-food");

    expect(storage.getCategories().map((c) => c.id)).toEqual(["c-taxi"]);
    expect(storage.getBudgets().map((b) => b.id)).toEqual(["b-taxi", "b-overall"]);
  });
});
