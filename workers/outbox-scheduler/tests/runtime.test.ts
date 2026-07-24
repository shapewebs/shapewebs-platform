import { describe, expect, it } from "vitest";

import {
  bindRuntimeFetch,
  runOutboxSchedule,
  type SchedulerDependencies,
} from "../src/scheduler";

const scheduledTime = Date.parse("2026-07-24T18:00:00.000Z");

describe("outbox scheduler Workers runtime", () => {
  it("binds the runtime fetch to the Workers global context", async () => {
    const unboundFetch = function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(new Response(null, { status: 204 }));
    } as unknown as typeof fetch;

    const response = await bindRuntimeFetch(unboundFetch)(
      "https://example.com",
    );

    expect(response.status).toBe(204);
  });

  it("uses the Workers fetch, stream, abort, crypto, and URL APIs", async () => {
    const calls: string[] = [];
    const dependencies: SchedulerDependencies = {
      async fetch(input) {
        const url = input instanceof Request ? input.url : input.toString();
        calls.push(url);

        if (url.endsWith("/api/jobs/outbox")) {
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({
                      permanentFailures: 0,
                      processed: 0,
                      retryableFailures: 0,
                    }),
                  ),
                );
                controller.close();
              },
            }),
            {
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(null, { status: 204 });
      },
      log() {},
      now: () => scheduledTime,
      randomUUID: () => crypto.randomUUID(),
    };

    await expect(
      runOutboxSchedule(
        {
          cron: "*/5 * * * *",
          scheduledTime,
        },
        {
          CHECKLY_HEARTBEAT_URL:
            "https://ping.checklyhq.com/11111111-2222-4333-8444-555555555555",
          OUTBOX_CRON_SECRET:
            "runtime-cron-secret-that-is-longer-than-thirty-two-characters",
          OUTBOX_TARGET_URL:
            "https://admin-staging.shapewebs.com/api/jobs/outbox",
          SHAPEWEBS_ENVIRONMENT: "staging",
          VERCEL_AUTOMATION_BYPASS:
            "runtime-bypass-that-is-longer-than-thirty-two-characters",
        },
        dependencies,
      ),
    ).resolves.toBeUndefined();

    expect(calls).toEqual([
      "https://admin-staging.shapewebs.com/api/jobs/outbox",
      "https://ping.checklyhq.com/11111111-2222-4333-8444-555555555555",
    ]);
    expect(typeof AbortSignal.timeout).toBe("function");
  });
});
