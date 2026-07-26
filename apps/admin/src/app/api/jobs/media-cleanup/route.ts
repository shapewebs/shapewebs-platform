import { randomUUID } from "node:crypto";

import {
  completeMediaCleanup,
  listMediaCleanupCandidates,
} from "@shapewebs/database/server";
import { createVercelPrivateMediaStorage } from "@shapewebs/media/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { hasValidBearerSecret } from "@/lib/job-security";
import { reconcileMediaCleanupCandidates } from "@/lib/media-cleanup";
import { getMediaEnvironment } from "@/lib/media-environment";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

const cleanupStaleAfterMs = 15 * 60 * 1_000;
const requestIdPattern = /^[A-Za-z0-9_-]{8,128}$/;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-worker",
});

export async function POST(request: Request) {
  const candidateRequestId = request.headers.get("x-request-id");
  const requestId =
    candidateRequestId && requestIdPattern.test(candidateRequestId)
      ? candidateRequestId
      : randomUUID();
  const startedAt = Date.now();

  if (
    !hasValidBearerSecret(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    logger.log({
      eventCode: "shapewebs.media.cleanup",
      level: "warn",
      requestId,
      result: "denied",
    });
    return Response.json(
      { error: "unauthorized" },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }

  const environment = getMediaEnvironment();

  if (!environment) {
    logger.log({
      eventCode: "shapewebs.media.cleanup",
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
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }

  let candidates;

  try {
    candidates = await listMediaCleanupCandidates(environment.databaseUrl, {
      organizationId: environment.organizationId,
      staleBefore: new Date(Date.now() - cleanupStaleAfterMs),
    });
  } catch {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.cleanup",
      level: "error",
      metadata: {
        dependency: "database",
        reasonCode: "candidate_query_failed",
      },
      requestId,
      result: "failure",
    });
    return Response.json(
      { error: "service_unavailable" },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }

  const { cleaned, failed } = await reconcileMediaCleanupCandidates({
    candidates,
    complete: (fileId) =>
      completeMediaCleanup(environment.databaseUrl, {
        fileId,
        organizationId: environment.organizationId,
        requestId,
      }),
    createStorage: (storeId) =>
      createVercelPrivateMediaStorage({
        storeId,
      }),
  });

  logger.log({
    durationMs: Date.now() - startedAt,
    eventCode: "shapewebs.media.cleanup",
    level: failed > 0 ? "warn" : "info",
    metadata: {
      count: cleaned,
      reasonCode: failed > 0 ? "candidate_cleanup_failed" : "run_completed",
      resourceType: "private_image",
    },
    requestId,
    result: failed > 0 ? "degraded" : "success",
  });

  return Response.json(
    {
      cleaned,
      failed,
      status: failed > 0 ? "degraded" : "ok",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
