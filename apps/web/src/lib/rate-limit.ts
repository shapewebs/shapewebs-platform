type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

type InMemoryRateLimiterOptions = {
  maxEntries?: number;
  now?: () => number;
};

const defaultRateLimitOptions: RateLimitOptions = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

export function createInMemoryRateLimiter({
  maxEntries = 10_000,
  now = Date.now,
}: InMemoryRateLimiterOptions = {}) {
  const entries = new Map<string, RateLimitEntry>();

  function pruneEntries(currentTime: number) {
    if (entries.size < maxEntries) {
      return;
    }

    for (const [key, entry] of entries) {
      if (entry.resetAt <= currentTime) {
        entries.delete(key);
      }
    }

    if (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;

      if (oldestKey) {
        entries.delete(oldestKey);
      }
    }
  }

  return function consumeRateLimit(
    key: string,
    options: RateLimitOptions = defaultRateLimitOptions,
  ) {
    const currentTime = now();
    const entry = entries.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      pruneEntries(currentTime);
      entries.set(key, {
        count: 1,
        resetAt: currentTime + options.windowMs,
      });
      return { allowed: true as const };
    }

    if (entry.count >= options.maxRequests) {
      return {
        allowed: false as const,
        retryAfterMs: entry.resetAt - currentTime,
      };
    }

    entry.count += 1;
    entries.set(key, entry);
    return { allowed: true as const };
  };
}

export const consumeRateLimit = createInMemoryRateLimiter();
