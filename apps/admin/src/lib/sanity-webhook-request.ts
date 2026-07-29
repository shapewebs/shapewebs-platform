import type { SanityWebhookPayload } from "@shapewebs/content-schema";

const safeProviderHeaderPattern = /^[A-Za-z0-9._:-]+$/u;
const safeQuotedIdempotencyKeyPattern = /^"[A-Za-z0-9._:-]+"$/u;

function readProviderHeader(
  headers: Headers,
  name: string,
  maximumLength = 180,
): string | null {
  const value = headers.get(name);

  return value &&
    value.length <= maximumLength &&
    safeProviderHeaderPattern.test(value)
    ? value
    : null;
}

function readIdempotencyKey(headers: Headers): string | null {
  const value = headers.get("idempotency-key");

  if (!value || value.length > 180) {
    return null;
  }

  if (safeProviderHeaderPattern.test(value)) {
    return value;
  }

  return safeQuotedIdempotencyKeyPattern.test(value)
    ? value.slice(1, -1)
    : null;
}

export function validateSanityDeliveryHeaders(
  headers: Headers,
  expected: {
    dataset: string;
    projectId: string;
  },
) {
  const eventId = readIdempotencyKey(headers);
  const webhookId = readProviderHeader(headers, "sanity-webhook-id");
  const transactionId = readProviderHeader(headers, "sanity-transaction-id");
  const transactionTimeValue = headers.get("sanity-transaction-time");

  if (!eventId) {
    return {
      reasonCode: "idempotency_key_invalid",
      status: "invalid",
    } as const;
  }

  if (!webhookId) {
    return {
      reasonCode: "webhook_id_invalid",
      status: "invalid",
    } as const;
  }

  if (!transactionId) {
    return {
      reasonCode: "transaction_id_invalid",
      status: "invalid",
    } as const;
  }

  if (!transactionTimeValue || transactionTimeValue.length > 80) {
    return {
      reasonCode: "transaction_time_invalid",
      status: "invalid",
    } as const;
  }

  if (headers.get("sanity-project-id") !== expected.projectId) {
    return {
      reasonCode: "project_id_mismatch",
      status: "invalid",
    } as const;
  }

  if (headers.get("sanity-dataset") !== expected.dataset) {
    return {
      reasonCode: "dataset_mismatch",
      status: "invalid",
    } as const;
  }

  const occurredAt = new Date(transactionTimeValue);

  if (Number.isNaN(occurredAt.getTime())) {
    return {
      reasonCode: "transaction_time_invalid",
      status: "invalid",
    } as const;
  }

  return {
    delivery: {
      eventId,
      occurredAt,
      transactionId,
      webhookId,
    },
    status: "valid",
  } as const;
}

export function parseSanityDeliveryHeaders(
  headers: Headers,
  expected: {
    dataset: string;
    projectId: string;
  },
) {
  const validation = validateSanityDeliveryHeaders(headers, expected);

  return validation.status === "valid" ? validation.delivery : null;
}

export function getSanityWebhookRevalidationRequests(
  event: SanityWebhookPayload,
  options: {
    vercelOidcToken?: string;
  } = {},
) {
  const workloadIdentity =
    options.vercelOidcToken === undefined
      ? {}
      : { vercelOidcToken: options.vercelOidcToken };

  if (event._type === "blogPost") {
    const hasCurrentRoute = Boolean(event.locale && event.slug);
    const hasPreviousRoute = Boolean(
      event.previousLocale && event.previousSlug,
    );
    const hasPartialCurrentRoute =
      Boolean(event.locale) !== Boolean(event.slug);
    const hasPartialPreviousRoute =
      Boolean(event.previousLocale) !== Boolean(event.previousSlug);

    if (
      hasPartialCurrentRoute ||
      hasPartialPreviousRoute ||
      (event.operation === "create" && !hasCurrentRoute) ||
      (event.operation === "delete" && !hasPreviousRoute) ||
      (event.operation === "update" && !hasCurrentRoute && !hasPreviousRoute)
    ) {
      return null;
    }

    const pathsByLocale = new Map<"da-DK" | "en", Set<string>>();

    for (const route of [
      hasCurrentRoute ? { locale: event.locale, slug: event.slug } : undefined,
      hasPreviousRoute
        ? { locale: event.previousLocale, slug: event.previousSlug }
        : undefined,
    ]) {
      if (!route?.locale || !route.slug) {
        continue;
      }

      const paths = pathsByLocale.get(route.locale) ?? new Set<string>();
      paths.add(route.locale === "en" ? "/blog" : "/da-DK/blog");
      paths.add(
        route.locale === "en"
          ? `/blog/${route.slug}`
          : `/da-DK/blog/${route.slug}`,
      );
      pathsByLocale.set(route.locale, paths);
    }

    return [...pathsByLocale.entries()].map(([localeCode, paths]) => ({
      contentType: "post" as const,
      documentId: event._id,
      localeCode,
      paths: [...paths],
      ...workloadIdentity,
    }));
  }

  return [
    {
      contentType: "post" as const,
      documentId: event._id,
      localeCode: "en" as const,
      paths: ["/blog"],
      ...workloadIdentity,
    },
    {
      contentType: "post" as const,
      documentId: event._id,
      localeCode: "da-DK" as const,
      paths: ["/da-DK/blog"],
      ...workloadIdentity,
    },
  ];
}
