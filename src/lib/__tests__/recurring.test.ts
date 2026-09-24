import { describe, it, expect, beforeEach } from "vitest";
import { dueOccurrences, materializeRecurring, occurrenceId, occurrenceIn } from "../recurring";
import * as storage from "../storage";
import type { Category, RecurringRule, Transaction } from "../../types";

const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
  id: "r1",
  type: "expense",
  amount: 5_000_000,
  categoryId: "c-rent",
  note: "Аренда",
  dayOfMonth: 31,
  startDate: "2026-01-31",
  lastDate: "2026-01-31",
  createdAt: "2026-01-31T00:00:00.000Z",
  ...over,
});

const cat: Category = { id: "c-rent", name: "Жильё", icon: "🏠", color: "#000", type: "expense", createdAt: "" };

describe("monthly occurrences", () => {
  it("clamps the day to short months (31 → 28 Feb, 30 Apr)", () => {
    expect(occurrenceIn(2026, 1, 31)).toBe("2026-02-28");
    expect(occurrenceIn(2028, 1, 31)).toBe("2028-02-29");
    expect(occurrenceIn(2026, 3, 31)).toBe("2026-04-30");
    expect(occurrenceIn(2026, 11, 15)).toBe("2026-12-15");
  });

  it("keeps the original day after a short month", () => {
    expect(dueOccurrences(rule(), "2026-05-31")).toEqual(["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("is not due before its day", () => {
    expect(dueOccurrences(rule({ dayOfMonth: 10, lastDate: "2026-09-10" }), "2026-10-09")).toEqual([]);
    expect(dueOccurrences(rule({ dayOfMonth: 10, lastDate: "2026-09-10" }), "2026-10-10")).toEqual(["2026-10-10"]);
  });

  it("crosses the year boundary", () => {
    expect(dueOccurrences(rule({ dayOfMonth: 5, lastDate: "2026-12-05" }), "2027-01-05")).toEqual(["2027-01-05"]);
  });
});

describe("materializeRecurring", () => {
  it("catches up missed months, carries the note and advances lastDate", () => {
    const r = materializeRecurring([rule({ dayOfMonth: 1, lastDate: "2026-07-01" })], [], "2026-09-24", "now");
    expect(r.added).toBe(2);
    expect(r.transactions.map((t) => t.date)).toEqual(["2026-08-01", "2026-09-01"]);
    expect(r.transactions[0]).toMatchObject({ id: occurrenceId("r1", "2026-08-01"), recurringId: "r1", note: "Аренда", amount: 5_000_000 });
    expect(r.rules[0].lastDate).toBe("2026-09-01");
  });

  it("never duplicates an occurrence that already exists (e.g. added in another tab)", () => {
    const existing = { id: occurrenceId("r1", "2026-08-01") } as Transaction;
    const r = materializeRecurring([rule({ dayOfMonth: 1, lastDate: "2026-07-01" })], [existing], "2026-08-24", "now");
    expect(r.added).toBe(0);
    expect(r.rules[0].lastDate).toBe("2026-08-01");
  });

  it("returns the same lists when nothing is due", () => {
    const txs: Transaction[] = [];
    const rules = [rule({ dayOfMonth: 1, lastDate: "2026-09-01" })];
    const r = materializeRecurring(rules, txs, "2026-09-24");
    expect(r.transactions).toBe(txs);
    expect(r.rules[0]).toBe(rules[0]);
  });
});

describe("repeating operations in storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    storage.saveCategories([cat]);
    storage.saveTransactions([]);
  });

  it("applyRecurring writes due operations once and is idempotent", () => {
    storage.createRecurringRule(rule({ dayOfMonth: 1, lastDate: "2026-08-01" }));
    expect(storage.applyRecurring("2026-09-24")).toBe(1);
    expect(storage.applyRecurring("2026-09-24")).toBe(0);
    expect(storage.getTransactions().map((t) => t.date)).toEqual(["2026-09-01"]);
    expect(storage.getRecurringRules()[0].lastDate).toBe("2026-09-01");
  });

  it("round-trips rules and notes through a backup", () => {
    storage.createRecurringRule(rule());
    storage.saveTransactions([
      { id: "t1", type: "expense", amount: 1, categoryId: "c-rent", date: "2026-01-31", note: "Аренда", recurringId: "r1", createdAt: "", updatedAt: "" },
    ]);
    const backup = storage.exportBackup();
    window.localStorage.clear();
    storage.importBackup(JSON.parse(JSON.stringify(backup)));
    expect(storage.getRecurringRules()).toEqual([rule()]);
    expect(storage.getTransactions()[0]).toMatchObject({ note: "Аренда", recurringId: "r1" });
  });

  it("rejects broken rules and drops rules of missing categories", () => {
    const base = storage.exportBackup();
    expect(() => storage.importBackup({ ...base, recurring: [rule({ dayOfMonth: 32 })] })).toThrow(storage.InvalidBackupError);
    expect(() => storage.importBackup({ ...base, recurring: [rule({ lastDate: "nope" })] })).toThrow(storage.InvalidBackupError);
    storage.importBackup({ ...base, recurring: [rule({ categoryId: "gone" })] });
    expect(storage.getRecurringRules()).toEqual([]);
  });

  it("rejects an over-long note in a backup", () => {
    const base = storage.exportBackup();
    const tx = { id: "t1", type: "expense", amount: 1, categoryId: "c-rent", date: "2026-01-31", note: "x".repeat(501) };
    expect(() => storage.importBackup({ ...base, transactions: [tx] })).toThrow(storage.InvalidBackupError);
  });

  it("deleting a category removes its rules; reassigning moves them", () => {
    storage.saveCategories([cat, { ...cat, id: "c-other" }]);
    storage.createRecurringRule(rule());
    storage.reassignCategory("c-rent", "c-other");
    expect(storage.getRecurringRules()[0].categoryId).toBe("c-other");
    storage.deleteCategory("c-other");
    expect(storage.getRecurringRules()).toEqual([]);
  });

  it("'delete all data' clears rules", () => {
    storage.createRecurringRule(rule());
    storage.clearAllData();
    expect(storage.getRecurringRules()).toEqual([]);
  });
});

describe("starting a repeating operation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    storage.saveCategories([cat]);
    storage.saveTransactions([]);
  });

  const first: Transaction = {
    id: "t-first",
    type: "expense",
    amount: 5_000_000,
    categoryId: "c-rent",
    date: "2026-01-31",
    recurringId: "r1",
    createdAt: "",
    updatedAt: "",
  };

  it("writes the first operation and the rule together", () => {
    storage.createRecurring(rule(), first);
    expect(storage.getTransactions()).toEqual([first]);
    expect(storage.getRecurringRules()).toEqual([rule()]);
  });

  it("writes neither when storage is full", () => {
    storage.getRecurringRules(); // initialize before counting writes
    const proto = Object.getPrototypeOf(window.localStorage) as Storage;
    const original = proto.setItem;
    let calls = 0;
    proto.setItem = function (this: Storage, key: string, value: string) {
      if (key !== "pft:__test__" && ++calls === 2) throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
    try {
      expect(() => storage.createRecurring(rule(), first)).toThrow();
    } finally {
      proto.setItem = original;
    }
    expect(storage.getTransactions()).toEqual([]);
    expect(storage.getRecurringRules()).toEqual([]);
  });
});

describe("recurring edge cases (1.5.1)", () => {
  it("a rule on the 29th: 28 Feb in a common year, 29 Feb in a leap year, back to the 29th after", () => {
    const r29 = rule({ dayOfMonth: 29, lastDate: "2027-01-29" });
    expect(dueOccurrences(r29, "2027-03-31")).toEqual(["2027-02-28", "2027-03-29"]);
    expect(dueOccurrences({ ...r29, lastDate: "2028-01-29" }, "2028-03-31")).toEqual(["2028-02-29", "2028-03-29"]);
  });

  it("the 30th and 31st in February and in 30-day months", () => {
    expect(dueOccurrences(rule({ dayOfMonth: 30, lastDate: "2027-01-30" }), "2027-04-30")).toEqual([
      "2027-02-28",
      "2027-03-30",
      "2027-04-30",
    ]);
    expect(dueOccurrences(rule({ dayOfMonth: 31, lastDate: "2027-05-31" }), "2027-08-31")).toEqual([
      "2027-06-30",
      "2027-07-31",
      "2027-08-31",
    ]);
  });

  it("crosses December → January, including a catch-up over the new year", () => {
    expect(dueOccurrences(rule({ dayOfMonth: 31, lastDate: "2026-11-30" }), "2027-02-01")).toEqual([
      "2026-12-31",
      "2027-01-31",
    ]);
  });

  it("created on the last day of a month (31 Jan) → 28 Feb, not 3 March", () => {
    expect(dueOccurrences(rule({ dayOfMonth: 31, startDate: "2027-01-31", lastDate: "2027-01-31" }), "2027-03-05")).toEqual([
      "2027-02-28",
    ]);
  });

  it("two identical rules each add their own operation (independent ids)", () => {
    const a = rule({ id: "a", dayOfMonth: 1, lastDate: "2026-08-01" });
    const b = rule({ id: "b", dayOfMonth: 1, lastDate: "2026-08-01" });
    const r = materializeRecurring([a, b], [], "2026-09-24", "now");
    expect(r.transactions.map((t) => t.id).sort()).toEqual(["a@2026-09-01", "b@2026-09-01"]);
  });

  it("a long absence is caught up but capped (no runaway loop)", () => {
    const dates = dueOccurrences(rule({ dayOfMonth: 1, lastDate: "2000-01-01" }), "2026-09-24");
    expect(dates.length).toBe(120);
    expect(dates[0]).toBe("2000-02-01");
  });
});

describe("stopping a rule (storage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    storage.saveCategories([cat]);
    storage.saveTransactions([]);
  });

  it("keeps the operations it already added, and adds no more", () => {
    storage.createRecurringRule(rule({ dayOfMonth: 1, lastDate: "2026-07-01" }));
    expect(storage.applyRecurring("2026-09-24")).toBe(2);
    storage.deleteRecurringRule("r1");
    expect(storage.getTransactions()).toHaveLength(2);
    expect(storage.applyRecurring("2026-12-24")).toBe(0);
    expect(storage.getTransactions()).toHaveLength(2);
  });
});
