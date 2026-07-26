import { randomUUID } from "node:crypto";

import { decryptCustomerEmailToken } from "@shapewebs/auth/server";
import {
  claimCustomerAuthEmail,
  completeCustomerAuthEmail,
  failCustomerAuthEmail,
} from "@shapewebs/database/server";
import { sendCustomerAuthNotification } from "@shapewebs/email/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { getPortalAuthEmailEnvironment } from "@/lib/auth-email-environment";
import { hasValidPortalJobSecret } from "@/lib/job-security";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const maximumBatchSize = 10;
const maximumRuntimeMs = 20_000;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-portal",
});

function nextRetryAt(attempt: number): Date {
  const delaySeconds = Math.min(30 * 2 ** Math.max(attempt - 1, 0), 15 * 60);
  return new Date(Date.now() + delaySeconds * 1_000);
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  if (
    !hasValidPortalJobSecret(
      request.headers.get("authorization"),
      process.env.PORTAL_CRON_SECRET,
    )
  ) {
    return Response.json(
      { error: "unauthorized" },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }

  const environment = getPortalAuthEmailEnvironment();
  if (!environment) {
    return Response.json(
      { error: "service_unavailable" },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }

  const startedAt = Date.now();
  const workerId = randomUUID();
  let permanentFailures = 0;
  let processed = 0;
  let retryableFailures = 0;

  try {
    for (
      let index = 0;
      index < maximumBatchSize && Date.now() - startedAt < maximumRuntimeMs;
      index += 1
    ) {
      const email = await claimCustomerAuthEmail(environment.databaseUrl, {
        organizationId: environment.organizationId,
        workerId,
      });
      if (!email) break;

      const token = await decryptCustomerEmailToken(
        email.encryptedToken,
        environment.encryptionSecret,
      );
      const delivery = token
        ? await sendCustomerAuthNotification(environment.resendApiKey, {
            from: environment.from,
            idempotencyKey: email.idempotencyKey,
            kind: email.kind,
            portalBaseUrl: environment.portalBaseUrl,
            to: email.recipient,
            token,
          })
        : {
            errorCode: "encrypted_token_invalid",
            status: "permanent_failure" as const,
          };

      if (delivery.status === "sent") {
        const completed = await completeCustomerAuthEmail(
          environment.databaseUrl,
          {
            eventId: email.eventId,
            organizationId: environment.organizationId,
            providerMessageId: delivery.providerMessageId,
            workerId,
          },
        );
        if (!completed) break;
        processed += 1;
        continue;
      }

      const permanent =
        delivery.status === "permanent_failure" || email.attempt >= 10;
      const failed = await failCustomerAuthEmail(environment.databaseUrl, {
        errorCode:
          email.attempt >= 10 ? "retry_attempts_exhausted" : delivery.errorCode,
        eventId: email.eventId,
        nextAttemptAt: nextRetryAt(email.attempt),
        organizationId: environment.organizationId,
        permanent,
        workerId,
      });
      if (!failed) break;
      if (permanent) permanentFailures += 1;
      else retryableFailures += 1;
    }
  } catch {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.customer_auth_email.run",
      level: "error",
      metadata: { reasonCode: "worker_exception" },
      requestId,
      result: "failure",
    });
    return Response.json(
      { error: "worker_failed" },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }

  logger.log({
    durationMs: Date.now() - startedAt,
    eventCode: "shapewebs.customer_auth_email.run",
    level: permanentFailures > 0 ? "warn" : "info",
    metadata: {
      count: processed,
      operation: `permanent:${permanentFailures};retryable:${retryableFailures}`,
    },
    requestId,
    result: permanentFailures > 0 ? "degraded" : "success",
  });

  return Response.json(
    { permanentFailures, processed, retryableFailures },
    { headers: { "Cache-Control": "no-store" } },
  );
}
