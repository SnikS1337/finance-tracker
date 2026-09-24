import { describe, it, expect, afterEach, vi } from "vitest";
import { newId } from "../id";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newId", () => {
  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111", getRandomValues: () => {} });
    expect(newId()).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("falls back to getRandomValues outside secure contexts (plain http on the LAN)", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = (i * 37 + 11) & 0xff;
        return arr;
      },
    });
    const id = newId();
    expect(UUID_V4.test(id)).toBe(true);
  });

  it("still works with no crypto at all", () => {
    vi.stubGlobal("crypto", undefined);
    expect(UUID_V4.test(newId())).toBe(true);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
  });
});
