import { describe, expect, it } from "vitest";
import { createInMemoryRateLimiter } from "../../apps/web/src/lib/rate-limit";

describe("in-memory rate limiter", () => {
  it("blocks requests after the configured limit and reports the retry window", () => {
    let currentTime = 1_000;
    const consume = createInMemoryRateLimiter({
      now: () => currentTime,
    });
    const options = { maxRequests: 2, windowMs: 500 };

    expect(consume("visitor", options)).toEqual({ allowed: true });
    expect(consume("visitor", options)).toEqual({ allowed: true });
    expect(consume("visitor", options)).toEqual({
      allowed: false,
      retryAfterMs: 500,
    });

    currentTime += 500;

    expect(consume("visitor", options)).toEqual({ allowed: true });
  });

  it("bounds memory by evicting the oldest active key", () => {
    const consume = createInMemoryRateLimiter({
      maxEntries: 2,
      now: () => 1_000,
    });
    const options = { maxRequests: 1, windowMs: 5_000 };

    expect(consume("first", options)).toEqual({ allowed: true });
    expect(consume("second", options)).toEqual({ allowed: true });
    expect(consume("third", options)).toEqual({ allowed: true });
    expect(consume("first", options)).toEqual({ allowed: true });
  });

  it("prunes expired entries before evicting an active key", () => {
    let currentTime = 1_000;
    const consume = createInMemoryRateLimiter({
      maxEntries: 2,
      now: () => currentTime,
    });
    const options = { maxRequests: 1, windowMs: 100 };

    expect(consume("expired", options)).toEqual({ allowed: true });
    currentTime += 100;
    expect(consume("active", options)).toEqual({ allowed: true });
    expect(consume("new", options)).toEqual({ allowed: true });
    expect(consume("active", options)).toEqual({
      allowed: false,
      retryAfterMs: 100,
    });
  });
});
