import { describe, expect, it, vi } from "vitest";

import {
  createStructuredLogger,
  evaluateReadiness,
  sanitizeLogValue,
} from "../../packages/observability/src/structured-logging";

describe("structured observability", () => {
  it("redacts sensitive keys and secret-shaped values", () => {
    expect(
      sanitizeLogValue({
        authorization: "Bearer exposed",
        nested: {
          cookie: "session=exposed",
          safe: "available",
        },
        provider: "sk_exposed",
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      nested: {
        cookie: "[REDACTED]",
        safe: "available",
      },
      provider: "[REDACTED]",
    });
  });

  it("bounds nested, array, string and unsupported log values", () => {
    const longValue = "a".repeat(600);
    const tooDeep = {
      first: { second: { third: { fourth: { fifth: true } } } },
    };

    expect(sanitizeLogValue([longValue, null, 2, false])).toEqual([
      "a".repeat(500),
      null,
      2,
      false,
    ]);
    expect(sanitizeLogValue(tooDeep)).toEqual({
      first: {
        second: {
          third: {
            fourth: {
              fifth: "[TRUNCATED]",
            },
          },
        },
      },
    });
    expect(sanitizeLogValue(undefined)).toBe("undefined");
  });

  it("emits the stable service, environment, deployment and event contract", () => {
    const sink = vi.fn();
    const logger = createStructuredLogger({
      deploymentId: "deployment-test",
      environment: "test",
      now: () => new Date("2026-07-24T10:00:00.000Z"),
      service: "shapewebs-web",
      sink,
    });

    logger.log({
      durationMs: 12,
      eventCode: "shapewebs.test.completed",
      level: "info",
      result: "success",
    });

    expect(sink).toHaveBeenCalledWith(
      "info",
      JSON.stringify({
        timestamp: "2026-07-24T10:00:00.000Z",
        service: "shapewebs-web",
        environment: "test",
        deploymentId: "deployment-test",
        durationMs: 12,
        eventCode: "shapewebs.test.completed",
        level: "info",
        result: "success",
      }),
    );
  });

  it.each([
    ["debug", "debug"],
    ["error", "error"],
    ["info", "info"],
    ["warn", "warn"],
  ] as const)(
    "routes %s events to the matching console sink",
    (level, method) => {
      const consoleSpy = vi
        .spyOn(console, method)
        .mockImplementation(() => undefined);
      const logger = createStructuredLogger({
        environment: "test",
        service: "shapewebs-admin",
      });

      logger.log({
        eventCode: "shapewebs.test.console",
        level,
        result: "success",
      });

      expect(consoleSpy).toHaveBeenCalledOnce();
      expect(consoleSpy.mock.calls[0]?.[0]).toContain(
        '"eventCode":"shapewebs.test.console"',
      );
    },
  );

  it("fails readiness closed when no checks exist", async () => {
    await expect(evaluateReadiness([])).resolves.toEqual({ ready: false });
  });

  it("returns ready only when every dependency succeeds", async () => {
    await expect(
      evaluateReadiness([
        {
          name: "database",
          check: async () => undefined,
        },
        {
          name: "captcha",
          check: async () => undefined,
        },
      ]),
    ).resolves.toEqual({ ready: true });

    await expect(
      evaluateReadiness([
        {
          name: "database",
          check: async () => {
            throw new Error("Unavailable");
          },
        },
      ]),
    ).resolves.toEqual({ ready: false });
  });

  it("times out a stalled dependency", async () => {
    await expect(
      evaluateReadiness(
        [
          {
            name: "database",
            check: () => new Promise(() => undefined),
          },
        ],
        1,
      ),
    ).resolves.toEqual({ ready: false });
  });
});
