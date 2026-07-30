import { createHash, randomUUID } from "node:crypto";

import {
  maximumSanityWebhookBodyBytes,
  sanityWebhookSignatureHeader,
  verifySanityWebhook,
} from "@shapewebs/content-platform/server";
import { recordSanityWebhook } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";
import { readBoundedText } from "@shapewebs/validation";

import { triggerPublicContentRevalidation } from "@/lib/public-revalidation";
import { getAdminSanityRuntime } from "@/lib/sanity";
import {
  getSanityWebhookRevalidationRequests,
  validateSanityDeliveryHeaders,
} from "@/lib/sanity-webhook-request";

export const dynamic = "force-dynamic";

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});
function jsonResponse(body: Record<string, string>, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const databaseUrl = process.env.DATABASE_URL;
  const organizationId = process.env.SHAPEWEBS_ORGANIZATION_ID;
  let sanity: ReturnType<typeof getAdminSanityRuntime>;

  try {
    sanity = getAdminSanityRuntime();
  } catch {
    sanity = null;
  }

  if (!databaseUrl || !organizationId || !sanity) {
    logger.log({
      eventCode: "shapewebs.webhook.sanity",
      level: "error",
      metadata: {
        dependency: databaseUrl && organizationId ? "content" : "database",
        reasonCode: "configuration_missing",
      },
      requestId,
      result: "failure",
    });
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    return jsonResponse({ error: "invalid_webhook" }, 415);
  }

  const rawBody = await readBoundedText(request, maximumSanityWebhookBodyBytes);

  if (rawBody.status !== "ok") {
    return jsonResponse({ error: "payload_too_large" }, 413);
  }

  let event: Awaited<ReturnType<typeof verifySanityWebhook>>;

  try {
    event = await verifySanityWebhook({
      rawBody: rawBody.value,
      secret: sanity.webhookEnvironment.webhookSecret,
      signature: request.headers.get(sanityWebhookSignatureHeader),
    });
  } catch {
    logger.log({
      eventCode: "shapewebs.webhook.sanity",
      level: "warn",
      metadata: {
        dependency: "content",
        reasonCode: "signature_or_payload_invalid",
      },
      requestId,
      result: "denied",
    });
    return jsonResponse({ error: "invalid_webhook" }, 400);
  }

  const deliveryValidation = validateSanityDeliveryHeaders(request.headers, {
    dataset: sanity.webhookEnvironment.dataset,
    projectId: sanity.webhookEnvironment.projectId,
  });

  if (deliveryValidation.status === "invalid") {
    logger.log({
      eventCode: "shapewebs.webhook.sanity",
      level: "warn",
      metadata: {
        dependency: "content",
        reasonCode: `provider_header_${deliveryValidation.reasonCode}`,
      },
      requestId,
      result: "denied",
    });
    return jsonResponse({ error: "invalid_webhook" }, 400);
  }

  const delivery = deliveryValidation.delivery;
  const { eventId, occurredAt, transactionId } = delivery;

  const revalidationRequests = getSanityWebhookRevalidationRequests(event, {
    vercelOidcToken: request.headers.get("x-vercel-oidc-token") ?? undefined,
  });

  if (!revalidationRequests) {
    return jsonResponse({ error: "invalid_webhook" }, 400);
  }

  let receiptStatus: "accepted" | "conflict" | "duplicate";

  try {
    ({ status: receiptStatus } = await recordSanityWebhook(databaseUrl, {
      bodyHash: createHash("sha256").update(rawBody.value).digest("hex"),
      eventId,
      eventType: `${event._type}.${event.operation}`,
      occurredAt,
      organizationId,
      transactionId,
    }));
  } catch {
    logger.log({
      eventCode: "shapewebs.webhook.sanity",
      level: "error",
      metadata: {
        dependency: "database",
        reasonCode: "persistence_failed",
      },
      requestId,
      result: "failure",
    });
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  if (receiptStatus === "conflict") {
    logger.log({
      eventCode: "shapewebs.webhook.sanity",
      level: "warn",
      metadata: {
        dependency: "content",
        reasonCode: "delivery_id_conflict",
      },
      requestId,
      result: "denied",
    });
    return jsonResponse({ error: "invalid_webhook" }, 409);
  }

  const revalidated = (
    await Promise.all(
      revalidationRequests.map((revalidationRequest) =>
        triggerPublicContentRevalidation(revalidationRequest),
      ),
    )
  ).every(Boolean);

  if (!revalidated) {
    logger.log({
      eventCode: "shapewebs.webhook.sanity",
      level: "error",
      metadata: {
        dependency: "content",
        operation: event.operation,
        reasonCode: "revalidation_unconfirmed",
        resourceType: event._type,
      },
      requestId,
      result: "failure",
    });
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  logger.log({
    eventCode: "shapewebs.webhook.sanity",
    level: "info",
    metadata: {
      operation: event.operation,
      reasonCode:
        receiptStatus === "duplicate" ? "duplicate_reprocessed" : "accepted",
      resourceType: event._type,
    },
    requestId,
    result: "success",
  });

  return jsonResponse({
    status: receiptStatus,
  });
}
