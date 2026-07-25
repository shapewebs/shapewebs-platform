import { describe, expect, it, vi } from "vitest";

import {
  bindRuntimeFetch,
  createRuntimeDependencies,
  runOutboxSchedule,
  type SchedulerBindings,
  type SchedulerDependencies,
} from "../../workers/outbox-scheduler/src/scheduler";

const cron = "*/5 * * * *";
const scheduledTime = Date.parse("2026-07-24T18:00:00.000Z");
const outboxTarget = "https://admin-staging.shapewebs.com/api/jobs/outbox";
const cronSecret = "cron-secret-that-is-longer-than-thirty-two-characters";
const bypassSecret = "vercel-bypass-that-is-longer-than-thirty-two-characters";
const heartbeatUrl =
  "https://ping.checklyhq.com/11111111-2222-4333-8444-555555555555";

const completeBindings: SchedulerBindings = {
  CHECKLY_HEARTBEAT_URL: heartbeatUrl,
  OUTBOX_CRON_SECRET: cronSecret,
  OUTBOX_TARGET_URL: outboxTarget,
  SHAPEWEBS_ENVIRONMENT: "staging",
  VERCEL_AUTOMATION_BYPASS: bypassSecret,
};

type FetchCall = {
  init?: RequestInit;
  url: string;
};

function createDependencies(fetchImplementation: typeof fetch): {
  dependencies: SchedulerDependencies;
  logs: Array<Record<string, unknown>>;
} {
  const logs: Array<Record<string, unknown>> = [];
  let now = scheduledTime + 100;

  return {
    dependencies: {
      fetch: fetchImplementation,
      log(record) {
        logs.push(record);
      },
      now() {
        now += 25;
        return now;
      },
      randomUUID() {
        return "11111111-2222-4333-8444-555555555555";
      },
    },
    logs,
  };
}

function getRequestUrl(input: Parameters<typeof fetch>[0]): string {
  if (input instanceof Request) {
    return input.url;
  }

  return input.toString();
}

function successfulOutboxResponse(
  result = {
    permanentFailures: 0,
    processed: 1,
    retryableFailures: 0,
  },
): Response {
  return Response.json(result);
}

describe("Cloudflare outbox scheduler", () => {
  it("creates request-scoped runtime dependencies with a bound fetch", async () => {
    const unboundFetch = function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(new Response(null, { status: 204 }));
    } as unknown as typeof fetch;

    const response = await bindRuntimeFetch(unboundFetch)(
      "https://example.com",
    );
    const runtimeDependencies = createRuntimeDependencies();

    expect(response.status).toBe(204);
    expect(runtimeDependencies).toEqual({
      fetch: expect.any(Function),
      log: expect.any(Function),
      now: expect.any(Function),
      randomUUID: expect.any(Function),
    });
  });

  it("invokes only the exact outbox target and heartbeats after success", async () => {
    const calls: FetchCall[] = [];
    const fetchImplementation: typeof fetch = async (input, init) => {
      const url = getRequestUrl(input);
      calls.push({ init, url });

      return url === outboxTarget
        ? successfulOutboxResponse()
        : new Response(null, { status: 204 });
    };
    const { dependencies, logs } = createDependencies(fetchImplementation);

    await expect(
      runOutboxSchedule(
        { cron, scheduledTime },
        completeBindings,
        dependencies,
      ),
    ).resolves.toBeUndefined();

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(outboxTarget);
    expect(calls[0]?.init).toMatchObject({
      cache: "no-store",
      method: "POST",
      redirect: "manual",
    });

    const outboxHeaders = new Headers(calls[0]?.init?.headers);
    expect(outboxHeaders.get("authorization")).toBe(`Bearer ${cronSecret}`);
    expect(outboxHeaders.get("x-vercel-protection-bypass")).toBe(bypassSecret);
    expect(outboxHeaders.get("x-request-id")).toBe(
      "11111111-2222-4333-8444-555555555555",
    );
    expect(calls[1]?.url).toBe(heartbeatUrl);
    expect(calls[1]?.init).toMatchObject({
      method: "POST",
      redirect: "manual",
    });
    expect(logs).toEqual([
      expect.objectContaining({
        eventCode: "shapewebs.outbox.scheduler",
        level: "info",
        permanentFailures: 0,
        processed: 1,
        result: "success",
        retryableFailures: 0,
      }),
    ]);

    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain(cronSecret);
    expect(serializedLogs).not.toContain(bypassSecret);
    expect(serializedLogs).not.toContain(heartbeatUrl);
  });

  it("fails configuration closed without making a request", async () => {
    const invalidBindings: SchedulerBindings[] = [
      { ...completeBindings, SHAPEWEBS_ENVIRONMENT: "production" },
      {
        ...completeBindings,
        OUTBOX_TARGET_URL: "https://admin-staging.shapewebs.com/api/jobs/other",
      },
      { ...completeBindings, OUTBOX_CRON_SECRET: "short" },
      { ...completeBindings, VERCEL_AUTOMATION_BYPASS: "short" },
      {
        ...completeBindings,
        CHECKLY_HEARTBEAT_URL:
          "https://ping.checklyhq.com.attacker.example/identifier",
      },
      {
        ...completeBindings,
        CHECKLY_HEARTBEAT_URL:
          "https://user:password@ping.checklyhq.com/identifier",
      },
      {
        ...completeBindings,
        CHECKLY_HEARTBEAT_URL: "https://ping.checklyhq.com/",
      },
      {
        ...completeBindings,
        CHECKLY_HEARTBEAT_URL:
          "https://ping.checklyhq.com/identifier?secret=exposed",
      },
      {
        ...completeBindings,
        CHECKLY_HEARTBEAT_URL: "https://ping.checklyhq.com/identifier#fragment",
      },
      {
        ...completeBindings,
        CHECKLY_HEARTBEAT_URL: "not-a-url",
      },
    ];

    for (const bindings of invalidBindings) {
      const fetchImplementation = vi.fn<typeof fetch>();
      const { dependencies, logs } = createDependencies(fetchImplementation);

      await expect(
        runOutboxSchedule({ cron, scheduledTime }, bindings, dependencies),
      ).rejects.toThrow("Shapewebs scheduler failure: configuration_invalid");
      expect(fetchImplementation).not.toHaveBeenCalled();
      expect(logs).toEqual([
        expect.objectContaining({
          reasonCode: "configuration_invalid",
          result: "failure",
        }),
      ]);
    }
  });

  it("rejects unexpected schedules before reading configuration", async () => {
    for (const controller of [
      { cron: "0 5 * * *", scheduledTime },
      { cron, scheduledTime: Number.NaN },
      { cron, scheduledTime: Number.POSITIVE_INFINITY },
    ]) {
      const fetchImplementation = vi.fn<typeof fetch>();
      const { dependencies, logs } = createDependencies(fetchImplementation);

      await expect(
        runOutboxSchedule(controller, completeBindings, dependencies),
      ).rejects.toThrow("Shapewebs scheduler failure: unexpected_schedule");
      expect(fetchImplementation).not.toHaveBeenCalled();
      expect(logs[0]).toMatchObject({
        reasonCode: "unexpected_schedule",
        result: "failure",
      });
    }
  });

  it("classifies outbox transport and non-200 failures without heartbeating", async () => {
    const cases: Array<{
      expectedReason: string;
      fetchImplementation: typeof fetch;
    }> = [
      {
        expectedReason: "outbox_unreachable",
        fetchImplementation: async () => {
          throw new Error("provider detail that must not escape");
        },
      },
      {
        expectedReason: "outbox_rejected",
        fetchImplementation: async () =>
          new Response(null, {
            headers: { Location: "https://vercel.com/login" },
            status: 302,
          }),
      },
      {
        expectedReason: "outbox_rejected",
        fetchImplementation: async () =>
          Response.json({ error: "service_unavailable" }, { status: 503 }),
      },
    ];

    for (const testCase of cases) {
      const fetchSpy = vi.fn(testCase.fetchImplementation);
      const { dependencies, logs } = createDependencies(fetchSpy);

      await expect(
        runOutboxSchedule(
          { cron, scheduledTime },
          completeBindings,
          dependencies,
        ),
      ).rejects.toThrow(
        `Shapewebs scheduler failure: ${testCase.expectedReason}`,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(logs[0]).toMatchObject({
        reasonCode: testCase.expectedReason,
        result: "failure",
      });
      expect(JSON.stringify(logs)).not.toContain("provider detail");
    }
  });

  it("rejects oversized outbox responses before parsing", async () => {
    const responses = [
      new Response("{}", {
        headers: {
          "content-length": "2049",
          "content-type": "application/json",
        },
      }),
      new Response("{}", {
        headers: {
          "content-length": "not-a-number",
          "content-type": "application/json",
        },
      }),
      new Response("x".repeat(2_049), {
        headers: { "content-type": "application/json" },
      }),
    ];

    for (const response of responses) {
      const { dependencies, logs } = createDependencies(async () => response);

      await expect(
        runOutboxSchedule(
          { cron, scheduledTime },
          completeBindings,
          dependencies,
        ),
      ).rejects.toThrow(
        "Shapewebs scheduler failure: outbox_response_too_large",
      );
      expect(logs[0]).toMatchObject({
        reasonCode: "outbox_response_too_large",
      });
    }
  });

  it("requires a bounded JSON response with nonnegative batch counts", async () => {
    const responses = [
      new Response(null, { headers: { "content-type": "application/json" } }),
      new Response("not-json", {
        headers: { "content-type": "application/json" },
      }),
      Response.json(null),
      Response.json([]),
      Response.json({}),
      successfulOutboxResponse({
        permanentFailures: -1,
        processed: 0,
        retryableFailures: 0,
      }),
      successfulOutboxResponse({
        permanentFailures: 0,
        processed: 1.5,
        retryableFailures: 0,
      }),
      successfulOutboxResponse({
        permanentFailures: 5,
        processed: 5,
        retryableFailures: 1,
      }),
      new Response("{}", { headers: { "content-type": "text/html" } }),
    ];

    for (const response of responses) {
      const { dependencies, logs } = createDependencies(async () => response);

      await expect(
        runOutboxSchedule(
          { cron, scheduledTime },
          completeBindings,
          dependencies,
        ),
      ).rejects.toThrow("Shapewebs scheduler failure: outbox_response_invalid");
      expect(logs[0]).toMatchObject({
        reasonCode: "outbox_response_invalid",
      });
    }
  });

  it("does not report success when the Checkly heartbeat fails", async () => {
    const cases: Array<{
      expectedReason: string;
      heartbeatResponse: () => Promise<Response>;
    }> = [
      {
        expectedReason: "heartbeat_unreachable",
        heartbeatResponse: async () => {
          throw new Error("private heartbeat detail");
        },
      },
      {
        expectedReason: "heartbeat_rejected",
        heartbeatResponse: async () => new Response(null, { status: 500 }),
      },
      {
        expectedReason: "heartbeat_rejected",
        heartbeatResponse: async () =>
          new Response(null, {
            headers: { Location: "https://example.com" },
            status: 302,
          }),
      },
    ];

    for (const testCase of cases) {
      let calls = 0;
      const fetchImplementation: typeof fetch = async () => {
        calls += 1;
        return calls === 1
          ? successfulOutboxResponse({
              permanentFailures: 0,
              processed: 0,
              retryableFailures: 0,
            })
          : testCase.heartbeatResponse();
      };
      const { dependencies, logs } = createDependencies(fetchImplementation);

      await expect(
        runOutboxSchedule(
          { cron, scheduledTime },
          completeBindings,
          dependencies,
        ),
      ).rejects.toThrow(
        `Shapewebs scheduler failure: ${testCase.expectedReason}`,
      );
      expect(calls).toBe(2);
      expect(logs[0]).toMatchObject({
        reasonCode: testCase.expectedReason,
        result: "failure",
      });
      expect(JSON.stringify(logs)).not.toContain("private heartbeat detail");
    }
  });

  it("sanitizes unexpected dependency failures", async () => {
    const { dependencies, logs } = createDependencies(async () =>
      successfulOutboxResponse(),
    );
    dependencies.randomUUID = () => {
      throw new Error(`must not leak ${cronSecret}`);
    };

    await expect(
      runOutboxSchedule(
        { cron, scheduledTime },
        completeBindings,
        dependencies,
      ),
    ).rejects.toThrow("Shapewebs scheduler failure: unexpected_failure");
    expect(logs[0]).toMatchObject({
      reasonCode: "unexpected_failure",
      requestId: "unavailable",
    });
    expect(JSON.stringify(logs)).not.toContain(cronSecret);
  });
});
