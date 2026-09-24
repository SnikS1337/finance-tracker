import { describe, it, expect } from "vitest";
import { MAX_AMOUNT, isValidAmount, parseAmountInput, formatAmountInput } from "../currency";

describe("amount limit", () => {
  it("MAX_AMOUNT is a safe integer with room to sum many of them", () => {
    expect(Number.isSafeInteger(MAX_AMOUNT)).toBe(true);
    expect(Number.isSafeInteger(MAX_AMOUNT * 1000)).toBe(true);
  });

  it("stops accepting digits beyond the limit instead of producing an unsafe number", () => {
    expect(parseAmountInput("999 999 999 999")).toBe(MAX_AMOUNT);
    expect(parseAmountInput("99999999999999999999")).toBe(MAX_AMOUNT);
    expect(Number.isSafeInteger(parseAmountInput("1".repeat(40)))).toBe(true);
  });

  it("still parses ordinary input as before", () => {
    expect(parseAmountInput("250 000")).toBe(250_000);
    expect(parseAmountInput("0045")).toBe(45);
    expect(parseAmountInput("")).toBe(0);
    expect(formatAmountInput("250000")).toBe((250_000).toLocaleString("ru-RU"));
  });

  it("validates storable amounts", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(MAX_AMOUNT)).toBe(true);
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
    expect(isValidAmount(1.5)).toBe(false);
    expect(isValidAmount("100")).toBe(false);
  });
});
