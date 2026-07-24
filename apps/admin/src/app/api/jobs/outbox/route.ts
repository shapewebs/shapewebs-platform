import { randomUUID } from "node:crypto";

import {
  claimLeadNotification,
  completeLeadNotification,
  failLeadNotification,
} from "@shapewebs/database/server";
import { sendLeadNotification } from "@shapewebs/email/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { hasValidBearerSecret } from "@/lib/job-security";
import { getOutboxEnvironment } from "@/lib/outbox-environment";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const maximumBatchSize = 10;
const maximumWorkerRuntimeMs = 20_000;

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-worker",
});

function nextRetryAt(attempt: number, now = new Date()): Date {
  const delaySeconds = Math.min(30 * 2 ** Math.max(attempt - 1, 0), 15 * 60);
  return new Date(now.getTime() + delaySeconds * 1_000);
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  if (
    !hasValidBearerSecret(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    logger.log({
      eventCode: "shapewebs.outbox.run",
      level: "warn",
      requestId,
      result: "denied",
    });
    return Response.json(
      { error: "unauthorized" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 401,
      },
    );
  }

  const environment = getOutboxEnvironment();

  if (!environment) {
    logger.log({
      eventCode: "shapewebs.outbox.run",
      level: "error",
      metadata: {
        dependency: "unknown",
        reasonCode: "environment_unavailable",
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

  const startedAt = Date.now();
  const workerId = randomUUID();
  let permanentFailures = 0;
  let processed = 0;
  let retryableFailures = 0;

  try {
    for (
      let index = 0;
      index < maximumBatchSize &&
      Date.now() - startedAt < maximumWorkerRuntimeMs;
      index += 1
    ) {
      const notification = await claimLeadNotification(
        environment.databaseUrl,
        {
          organizationId: environment.organizationId,
          workerId,
        },
      );

      if (!notification) {
        break;
      }

      const result = await sendLeadNotification(environment.resendApiKey, {
        adminBaseUrl: environment.adminBaseUrl,
        email: notification.email,
        from: environment.from,
        idempotencyKey: notification.idempotencyKey,
        kind: notification.kind,
        leadId: notification.leadId,
        name: notification.name,
        replyTo: notification.email,
        to: environment.to,
      });

      if (result.status === "sent") {
        const completed = await completeLeadNotification(
          environment.databaseUrl,
          {
            eventId: notification.eventId,
            organizationId: environment.organizationId,
            providerMessageId: result.providerMessageId,
            workerId,
          },
        );

        if (!completed) {
          logger.log({
            eventCode: "shapewebs.outbox.delivery",
            level: "error",
            metadata: {
              attempt: notification.attempt,
              reasonCode: "claim_lost_after_send",
              resourceType: "lead_notification",
            },
            requestId,
            result: "degraded",
          });
          break;
        }

        processed += 1;
        continue;
      }

      const permanent =
        result.status === "permanent_failure" || notification.attempt >= 10;
      const failed = await failLeadNotification(environment.databaseUrl, {
        errorCode:
          notification.attempt >= 10
            ? "retry_attempts_exhausted"
            : result.errorCode,
        eventId: notification.eventId,
        nextAttemptAt: nextRetryAt(notification.attempt),
        organizationId: environment.organizationId,
        permanent,
        workerId,
      });

      if (!failed) {
        logger.log({
          eventCode: "shapewebs.outbox.delivery",
          level: "error",
          metadata: {
            attempt: notification.attempt,
            reasonCode: "claim_lost_after_failure",
            resourceType: "lead_notification",
          },
          requestId,
          result: "degraded",
        });
        break;
      }

      if (permanent) {
        permanentFailures += 1;
      } else {
        retryableFailures += 1;
      }
    }
  } catch {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.outbox.run",
      level: "error",
      metadata: {
        count: processed,
        dependency: "database",
        reasonCode: "worker_exception",
      },
      requestId,
      result: "failure",
    });
    return Response.json(
      { error: "worker_failed" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }

  logger.log({
    durationMs: Date.now() - startedAt,
    eventCode: "shapewebs.outbox.run",
    level: permanentFailures > 0 ? "warn" : "info",
    metadata: {
      count: processed,
      operation: `permanent:${permanentFailures};retryable:${retryableFailures}`,
    },
    requestId,
    result: permanentFailures > 0 ? "degraded" : "success",
  });

  return Response.json(
    {
      permanentFailures,
      processed,
      retryableFailures,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
