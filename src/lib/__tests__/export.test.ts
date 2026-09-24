import { describe, it, expect, afterEach, vi } from "vitest";
import { buildCSV, CSV_SEPARATOR, reportFileName, saveFile } from "../export";
import type { Category, Transaction } from "../../types";

const categories: Category[] = [
  { id: "c1", name: "Кафе; бары", icon: "☕", color: "#000", type: "expense", createdAt: "" },
  { id: "c2", name: 'Зарплата "основная"', icon: "💼", color: "#000", type: "income", createdAt: "" },
];

const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t",
  type: "expense",
  amount: 45000,
  categoryId: "c1",
  date: "2026-09-10",
  createdAt: "",
  updatedAt: "",
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildCSV", () => {
  const csv = buildCSV(
    [tx({ id: "b", date: "2026-09-12", type: "income", categoryId: "c2", amount: 30_000_000 }), tx({ id: "a" })],
    categories
  );
  const lines = csv.replace(/^﻿/, "").split("\r\n");

  it("uses ';' as the separator (what Excel expects with Russian settings)", () => {
    expect(CSV_SEPARATOR).toBe(";");
    expect(lines[0].split(";")).toHaveLength(5);
  });

  it("starts with a UTF-8 BOM and uses CRLF line endings", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines).toHaveLength(3);
  });

  it("quotes values containing the separator or quotes", () => {
    expect(lines[1]).toBe('2026-09-10;расход;45000;"Кафе; бары";');
    expect(lines[2]).toBe('2026-09-12;доход;30000000;"Зарплата ""основная""";');
  });
});

describe("reportFileName", () => {
  it("names a calendar month, a year, a day, or an arbitrary span", () => {
    expect(reportFileName({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30, 23, 59) })).toBe("report-2026-09.png");
    expect(reportFileName({ start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) })).toBe("report-2026.png");
    expect(reportFileName({ start: new Date(2026, 8, 24), end: new Date(2026, 8, 24, 23) })).toBe("report-2026-09-24.png");
    expect(reportFileName({ start: new Date(2026, 8, 18), end: new Date(2026, 8, 24) })).toBe(
      "report-2026-09-18_2026-09-24.png"
    );
  });
});

describe("saveFile", () => {
  function stubEnvironment({ touch, canShare, share }: { touch: boolean; canShare: boolean; share?: () => Promise<void> }) {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: touch && q.includes("pointer: coarse"), media: q }));
    const shareSpy = vi.fn(share ?? (() => Promise.resolve()));
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: () => canShare, configurable: true });
    const clicks: string[] = [];
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    };
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    return {
      shareSpy,
      clicks,
      restore: () => {
        HTMLAnchorElement.prototype.click = origClick;
        delete (navigator as unknown as Record<string, unknown>).share;
        delete (navigator as unknown as Record<string, unknown>).canShare;
      },
    };
  }

  const blob = () => new Blob(["x"], { type: "text/plain" });

  it("downloads on desktop even if sharing is supported", async () => {
    const env = stubEnvironment({ touch: false, canShare: true });
    try {
      expect(await saveFile(blob(), "a.txt")).toBe("downloaded");
      expect(env.shareSpy).not.toHaveBeenCalled();
      expect(env.clicks).toEqual(["a.txt"]);
    } finally {
      env.restore();
    }
  });

  it("opens the share sheet on touch devices that can share files", async () => {
    const env = stubEnvironment({ touch: true, canShare: true });
    try {
      expect(await saveFile(blob(), "a.txt")).toBe("shared");
      expect(env.shareSpy).toHaveBeenCalledTimes(1);
      expect(env.clicks).toEqual([]);
    } finally {
      env.restore();
    }
  });

  it("does nothing more when the user closes the share sheet", async () => {
    const env = stubEnvironment({
      touch: true,
      canShare: true,
      share: () => Promise.reject(new DOMException("closed", "AbortError")),
    });
    try {
      expect(await saveFile(blob(), "a.txt")).toBe("cancelled");
      expect(env.clicks).toEqual([]);
    } finally {
      env.restore();
    }
  });

  it("falls back to a download when sharing fails or files can't be shared", async () => {
    const failing = stubEnvironment({
      touch: true,
      canShare: true,
      share: () => Promise.reject(new DOMException("no gesture", "NotAllowedError")),
    });
    try {
      expect(await saveFile(blob(), "a.txt")).toBe("downloaded");
      expect(failing.clicks).toEqual(["a.txt"]);
    } finally {
      failing.restore();
    }

    const unsupported = stubEnvironment({ touch: true, canShare: false });
    try {
      expect(await saveFile(blob(), "b.txt")).toBe("downloaded");
      expect(unsupported.shareSpy).not.toHaveBeenCalled();
    } finally {
      unsupported.restore();
    }
  });
});
