import { afterEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache.js";

describe("TtlCache", () => {
  afterEach(() => vi.useRealTimers());

  it("devuelve el valor antes de expirar", () => {
    vi.useFakeTimers();
    const cache = new TtlCache();
    cache.set("player:1", { name: "Ada" }, 1_000);
    expect(cache.get("player:1")).toEqual({ name: "Ada" });
  });

  it("elimina el valor expirado", () => {
    vi.useFakeTimers();
    const cache = new TtlCache();
    cache.set("player:1", "value", 1_000);
    vi.advanceTimersByTime(1_001);
    expect(cache.get("player:1")).toBeUndefined();
  });

  it("limita la memoria y expulsa la entrada menos reciente", () => {
    const cache = new TtlCache(2);
    cache.set("a", 1, 10_000);
    cache.set("b", 2, 10_000);
    expect(cache.get("a")).toBe(1);
    cache.set("c", 3, 10_000);

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
    expect(cache.size()).toBe(2);
  });
});
