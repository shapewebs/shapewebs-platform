import { randomUUID } from "node:crypto";

import { deleteExpiredSyntheticLeadSubmissions } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { hasValidBearerSecret } from "@/lib/job-security";
import { getSyntheticRetentionEnvironment } from "@/lib/synthetic-retention-environment";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-worker",
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const environment = getSyntheticRetentionEnvironment(request.url);

  if (!environment) {
    logger.log({
      eventCode: "shapewebs.retention.synthetic",
      level: "warn",
      metadata: {
        reasonCode: "environment_unavailable",
        resourceType: "synthetic_lead",
      },
      requestId,
      result: "denied",
    });
    return Response.json(
      { error: "not_found" },
      {
        headers: { "Cache-Control": "no-store" },
        status: 404,
      },
    );
  }

  if (
    !hasValidBearerSecret(
      request.headers.get("authorization"),
      environment.secret,
    )
  ) {
    logger.log({
      eventCode: "shapewebs.retention.synthetic",
      level: "warn",
      metadata: {
        reasonCode: "authorization_denied",
        resourceType: "synthetic_lead",
      },
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

  try {
    const deleted = await deleteExpiredSyntheticLeadSubmissions(
      environment.databaseUrl,
      {
        organizationId: environment.organizationId,
      },
    );

    logger.log({
      eventCode: "shapewebs.retention.synthetic",
      level: "info",
      metadata: {
        count: deleted,
        operation: "delete_expired",
        resourceType: "synthetic_lead",
      },
      requestId,
      result: "success",
    });

    return Response.json(
      {
        deleted,
        status: "completed",
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    logger.log({
      eventCode: "shapewebs.retention.synthetic",
      level: "error",
      metadata: {
        dependency: "database",
        reasonCode: "cleanup_failed",
        resourceType: "synthetic_lead",
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
