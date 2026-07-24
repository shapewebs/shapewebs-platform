import { createHash, randomUUID } from "node:crypto";

import { recordResendWebhook } from "@shapewebs/database/server";
import { verifyResendWebhook } from "@shapewebs/email/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";
import { readBoundedText } from "@shapewebs/validation";

export const dynamic = "force-dynamic";

const maximumWebhookBytes = 64 * 1_024;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

function getProviderMessageId(event: {
  data: unknown;
  type: string;
}): string | undefined {
  if (
    !event.type.startsWith("email.") ||
    typeof event.data !== "object" ||
    event.data === null ||
    !("email_id" in event.data)
  ) {
    return undefined;
  }

  const emailId = event.data.email_id;
  return typeof emailId === "string" && emailId ? emailId : undefined;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const databaseUrl = process.env.DATABASE_URL;
  const organizationId = process.env.SHAPEWEBS_ORGANIZATION_ID;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const eventId = request.headers.get("svix-id");
  const signature = request.headers.get("svix-signature");
  const timestamp = request.headers.get("svix-timestamp");

  if (
    !databaseUrl ||
    !organizationId ||
    !webhookSecret ||
    !eventId ||
    !signature ||
    !timestamp
  ) {
    logger.log({
      eventCode: "shapewebs.webhook.resend",
      level: "warn",
      metadata: {
        dependency: "email",
        reasonCode: "configuration_or_signature_headers_missing",
      },
      requestId,
      result: "denied",
    });
    return Response.json(
      { error: "invalid_webhook" },
      {
        headers: { "Cache-Control": "no-store" },
        status: databaseUrl && organizationId && webhookSecret ? 400 : 503,
      },
    );
  }

  const rawBody = await readBoundedText(request, maximumWebhookBytes);

  if (rawBody.status !== "ok") {
    return Response.json(
      { error: "payload_too_large" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 413,
      },
    );
  }

  let event: ReturnType<typeof verifyResendWebhook>;

  try {
    event = verifyResendWebhook({
      id: eventId,
      payload: rawBody.value,
      signature,
      timestamp,
      webhookSecret,
    });
  } catch {
    logger.log({
      eventCode: "shapewebs.webhook.resend",
      level: "warn",
      metadata: {
        dependency: "email",
        reasonCode: "signature_verification_failed",
      },
      requestId,
      result: "denied",
    });
    return Response.json(
      { error: "invalid_webhook" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 400,
      },
    );
  }

  const occurredAt = new Date(event.created_at);

  if (Number.isNaN(occurredAt.getTime())) {
    return Response.json(
      { error: "invalid_webhook" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 400,
      },
    );
  }

  try {
    const result = await recordResendWebhook(databaseUrl, {
      bodyHash: createHash("sha256").update(rawBody.value).digest("hex"),
      eventId,
      eventType: event.type,
      occurredAt,
      organizationId,
      providerMessageId: getProviderMessageId(event),
    });

    logger.log({
      eventCode: "shapewebs.webhook.resend",
      level: "info",
      metadata: {
        operation: event.type,
        reasonCode: result.duplicate ? "duplicate" : "accepted",
        resourceType: "email_event",
      },
      requestId,
      result: "success",
    });

    return Response.json(
      {
        status: result.duplicate ? "duplicate" : "accepted",
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    logger.log({
      eventCode: "shapewebs.webhook.resend",
      level: "error",
      metadata: {
        dependency: "database",
        reasonCode: "persistence_failed",
      },
      requestId,
      result: "failure",
    });
    return Response.json(
      { error: "service_unavailable" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }
}
