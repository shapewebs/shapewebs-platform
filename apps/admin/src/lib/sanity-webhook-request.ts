import type { SanityWebhookPayload } from "@shapewebs/content-schema";

const safeProviderHeaderPattern = /^[A-Za-z0-9._:-]+$/u;

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

export function parseSanityDeliveryHeaders(
  headers: Headers,
  expected: {
    dataset: string;
    projectId: string;
  },
) {
  const eventId = readProviderHeader(headers, "idempotency-key");
  const webhookId = readProviderHeader(headers, "sanity-webhook-id");
  const transactionId = readProviderHeader(headers, "sanity-transaction-id");
  const transactionTimeValue = headers.get("sanity-transaction-time");

  if (
    !eventId ||
    !webhookId ||
    !transactionId ||
    !transactionTimeValue ||
    transactionTimeValue.length > 80 ||
    headers.get("sanity-project-id") !== expected.projectId ||
    headers.get("sanity-dataset") !== expected.dataset
  ) {
    return null;
  }

  const occurredAt = new Date(transactionTimeValue);

  return Number.isNaN(occurredAt.getTime())
    ? null
    : {
        eventId,
        occurredAt,
        transactionId,
        webhookId,
      };
}

export function getSanityWebhookRevalidationRequests(
  event: SanityWebhookPayload,
) {
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
    }));
  }

  return [
    {
      contentType: "post" as const,
      documentId: event._id,
      localeCode: "en" as const,
      paths: ["/blog"],
    },
    {
      contentType: "post" as const,
      documentId: event._id,
      localeCode: "da-DK" as const,
      paths: ["/da-DK/blog"],
    },
  ];
}
