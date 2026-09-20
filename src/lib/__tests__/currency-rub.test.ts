import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRubEquivalent } from "../currency";
import { getBestKnownRate, refreshRateIfStale } from "../exchangeRate";

describe("formatRubEquivalent", () => {
  it("formats a normal amount with grouping and the ruble sign", () => {
    // toLocaleString("ru-RU") groups with a non-breaking space (U+00A0).
    expect(formatRubEquivalent(12_500_000, 0.0074)).toBe("≈ 92\u00A0500 ₽");
  });

  it("never produces NaN/undefined for a missing or invalid rate", () => {
    expect(formatRubEquivalent(1_000_000, NaN)).toBe("≈ 0 ₽");
    expect(formatRubEquivalent(1_000_000, 0)).toBe("≈ 0 ₽");
    expect(formatRubEquivalent(1_000_000, -1)).toBe("≈ 0 ₽");
  });

  it("never produces NaN/undefined for a non-finite amount", () => {
    expect(formatRubEquivalent(NaN, 0.0074)).toBe("≈ 0 ₽");
  });

  it("always shows a non-negative value (it's a magnitude, not a signed amount)", () => {
    expect(formatRubEquivalent(-1_000_000, 0.0074)).toBe("≈ 7\u00A0400 ₽");
  });
});

describe("getBestKnownRate (offline fallback)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns a valid positive rate even with nothing cached yet", () => {
    const rate = getBestKnownRate();
    expect(Number.isFinite(rate)).toBe(true);
    expect(rate).toBeGreaterThan(0);
  });

  it("ignores a corrupted cache entry and still returns a valid rate", () => {
    window.localStorage.setItem("pft:exchangeRate:vndToRub", "not json");
    const rate = getBestKnownRate();
    expect(Number.isFinite(rate)).toBe(true);
    expect(rate).toBeGreaterThan(0);
  });

  it("ignores a cached rate that is zero/negative/non-numeric", () => {
    window.localStorage.setItem(
      "pft:exchangeRate:vndToRub",
      JSON.stringify({ rate: -5, fetchedAt: new Date().toISOString() })
    );
    const rate = getBestKnownRate();
    expect(rate).toBeGreaterThan(0);
  });

  it("uses a valid cached rate when present", () => {
    window.localStorage.setItem(
      "pft:exchangeRate:vndToRub",
      JSON.stringify({ rate: 0.005, fetchedAt: new Date().toISOString() })
    );
    expect(getBestKnownRate()).toBe(0.005);
  });
});

describe("refreshRateIfStale (in-flight guard)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares a single request between concurrent callers instead of firing one each", async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = refreshRateIfStale();
    const second = refreshRateIfStale();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      json: async () => ({ rates: { RUB: 0.0041 } }),
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(0.0041);
    expect(secondResult).toBe(0.0041);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows a new request after the in-flight one has settled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    await refreshRateIfStale();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await refreshRateIfStale();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolves null and does not throw when the request errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    await expect(refreshRateIfStale()).resolves.toBeNull();
  });
});
