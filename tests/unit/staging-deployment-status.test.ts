import { describe, expect, it } from "vitest";

import { evaluateRequiredStatuses } from "../../tooling/scripts/wait-for-github-statuses.mjs";

const requiredContexts = ["Vercel – shapewebs-web", "Vercel – shapewebs-admin"];

describe("staging deployment status gate", () => {
  it("waits until every exact deployment context succeeds", () => {
    expect(evaluateRequiredStatuses(requiredContexts, [])).toEqual({
      pendingContexts: requiredContexts,
      state: "pending",
    });

    expect(
      evaluateRequiredStatuses(requiredContexts, [
        {
          context: requiredContexts[0],
          state: "success",
          updated_at: "2026-07-26T00:00:00Z",
        },
        {
          context: requiredContexts[1],
          state: "pending",
          updated_at: "2026-07-26T00:00:00Z",
        },
      ]),
    ).toEqual({
      pendingContexts: [requiredContexts[1]],
      state: "pending",
    });
  });

  it("uses only the newest status for each exact context", () => {
    expect(
      evaluateRequiredStatuses(requiredContexts, [
        {
          context: requiredContexts[0],
          state: "failure",
          updated_at: "2026-07-25T23:59:00Z",
        },
        {
          context: requiredContexts[0],
          state: "success",
          updated_at: "2026-07-26T00:00:00Z",
        },
        {
          context: requiredContexts[1],
          state: "success",
          updated_at: "2026-07-26T00:00:00Z",
        },
      ]),
    ).toEqual({ state: "success" });
  });

  it("fails closed on a current terminal deployment result", () => {
    expect(
      evaluateRequiredStatuses(requiredContexts, [
        {
          context: requiredContexts[0],
          state: "success",
          updated_at: "2026-07-26T00:00:00Z",
        },
        {
          context: requiredContexts[1],
          state: "error",
          updated_at: "2026-07-26T00:00:00Z",
        },
      ]),
    ).toEqual({
      context: requiredContexts[1],
      state: "failure",
    });
  });
});
