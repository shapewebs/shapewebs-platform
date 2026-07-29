import { describe, expect, it } from "vitest";

import { sanityWebhookPayloadSchema } from "../../packages/content-schema/src";
import {
  getSanityWebhookRevalidationRequests,
  parseSanityDeliveryHeaders,
} from "../../apps/admin/src/lib/sanity-webhook-request";

const expected = {
  dataset: "staging",
  projectId: "42f6331k",
};

function validHeaders(overrides: Record<string, string> = {}) {
  return new Headers({
    "idempotency-key": "delivery-123",
    "sanity-dataset": "staging",
    "sanity-project-id": "42f6331k",
    "sanity-transaction-id": "transaction-123",
    "sanity-transaction-time": "2026-07-29T10:00:00.000Z",
    "sanity-webhook-id": "webhook-123",
    ...overrides,
  });
}

describe("Sanity webhook request contract", () => {
  it("accepts exact project and dataset delivery headers", () => {
    expect(parseSanityDeliveryHeaders(validHeaders(), expected)).toEqual({
      eventId: "delivery-123",
      occurredAt: new Date("2026-07-29T10:00:00.000Z"),
      transactionId: "transaction-123",
      webhookId: "webhook-123",
    });
  });

  it("rejects cross-project, malformed, or injected headers", () => {
    for (const headers of [
      validHeaders({ "sanity-project-id": "other123" }),
      validHeaders({ "sanity-dataset": "production" }),
      validHeaders({ "sanity-transaction-time": "not-a-date" }),
      validHeaders({ "idempotency-key": "delivery injected" }),
      validHeaders({ "sanity-transaction-id": "" }),
    ]) {
      expect(parseSanityDeliveryHeaders(headers, expected)).toBeNull();
    }
  });

  it("maps blog and referenced-document events to exact public paths", () => {
    expect(
      getSanityWebhookRevalidationRequests({
        _id: "blog-post-one",
        _type: "blogPost",
        locale: "da-DK",
        operation: "update",
        previousLocale: "en",
        previousSlug: "secure-platform",
        slug: "sikker-platform",
      }),
    ).toEqual([
      {
        contentType: "post",
        documentId: "blog-post-one",
        localeCode: "da-DK",
        paths: ["/da-DK/blog", "/da-DK/blog/sikker-platform"],
      },
      {
        contentType: "post",
        documentId: "blog-post-one",
        localeCode: "en",
        paths: ["/blog", "/blog/secure-platform"],
      },
    ]);
    expect(
      getSanityWebhookRevalidationRequests({
        _id: "author-lukas",
        _type: "author",
        operation: "update",
      }),
    ).toHaveLength(2);
  });

  it("rejects incomplete blog projections", () => {
    expect(
      getSanityWebhookRevalidationRequests({
        _id: "blog-post-one",
        _type: "blogPost",
        operation: "delete",
      }),
    ).toBeNull();
  });

  it("uses the previous route for delete and accepts null provider projections", () => {
    expect(
      getSanityWebhookRevalidationRequests(
        sanityWebhookPayloadSchema.parse({
          _id: "blog-post-one",
          _type: "blogPost",
          locale: null,
          operation: "delete",
          previousLocale: "en",
          previousSlug: "retired-post",
          slug: null,
        }),
      ),
    ).toEqual([
      {
        contentType: "post",
        documentId: "blog-post-one",
        localeCode: "en",
        paths: ["/blog", "/blog/retired-post"],
      },
    ]);
  });
});
