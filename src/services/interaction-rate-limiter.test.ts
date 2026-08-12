import { describe, expect, it } from "vitest";
import { InteractionRateLimiter } from "./interaction-rate-limiter.js";

describe("InteractionRateLimiter", () => {
  it("frena una ráfaga por usuario y permite continuar al terminar la ventana", () => {
    const limiter = new InteractionRateLimiter(2, 1_000);

    expect(limiter.consume("user-1", 0).allowed).toBe(true);
    expect(limiter.consume("user-1", 100).allowed).toBe(true);
    expect(limiter.consume("user-1", 200)).toEqual({
      allowed: false,
      retryAfterMs: 800,
    });
    expect(limiter.consume("user-2", 200).allowed).toBe(true);
    expect(limiter.consume("user-1", 1_001).allowed).toBe(true);
  });
});
