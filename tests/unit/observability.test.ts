import { describe, expect, it, vi } from "vitest";

import {
  createStructuredLogger,
  evaluateReadiness,
  resolveShapewebsEnvironment,
  sanitizeLogValue,
} from "../../packages/observability/src/structured-logging";

describe("structured observability", () => {
  it("classifies local, test, preview and production runtimes consistently", () => {
    expect(resolveShapewebsEnvironment({})).toBe("development");
    expect(resolveShapewebsEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(
      resolveShapewebsEnvironment({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe("preview");
    expect(resolveShapewebsEnvironment({ NODE_ENV: "production" })).toBe(
      "production",
    );
  });

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

    for (const value of [
      "github_pat_0123456789abcdefghijklmnop",
      "re_0123456789abcdefghijklmnop",
      "https://example.test/callback?token=exposed",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
    ]) {
      expect(sanitizeLogValue(value)).toBe("[REDACTED]");
    }
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
    expect(sanitizeLogValue(undefined)).toBeUndefined();
    expect(
      sanitizeLogValue({
        actorIdHash: undefined,
        requestId: undefined,
        safe: "available",
      }),
    ).toEqual({
      safe: "available",
    });
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

  it("correlates logs with the active OpenTelemetry trace", () => {
    const sink = vi.fn();
    const logger = createStructuredLogger({
      environment: "test",
      getTraceId: () => "0123456789abcdef0123456789abcdef",
      service: "shapewebs-worker",
      sink,
    });

    logger.log({
      eventCode: "shapewebs.test.traced",
      level: "info",
      result: "success",
    });

    expect(sink.mock.calls[0]?.[1]).toContain(
      '"traceId":"0123456789abcdef0123456789abcdef"',
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
