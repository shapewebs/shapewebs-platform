import { createHmac, randomUUID } from "node:crypto";

// The deployable app owns the native runtime so Vercel traces it from the
// function root instead of relying on an indirect workspace dependency.
import "sharp";

import {
  completePrivateMediaUpload,
  failPrivateMediaUpload,
  getPrivateMediaUploadState,
  markPrivateMediaCleanupRequired,
  reservePrivateMediaUpload,
} from "@shapewebs/database/server";
import {
  createVercelPrivateMediaStorage,
  MediaImageError,
  normalizeMediaImage,
} from "@shapewebs/media/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { authorizeAdminApiSession } from "@/lib/auth";
import { isTrustedAdminOrigin } from "@/lib/better-auth";
import { getMediaEnvironment } from "@/lib/media-environment";
import { parseMediaUploadRequest } from "@/lib/media-request";
import { runPrivateMediaUpload } from "@/lib/media-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

const requestIdPattern = /^[A-Za-z0-9_-]{8,128}$/;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-admin",
});

function jsonNoStore(body: object, status: number) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function getRequestId(request: Request): string {
  const candidate = request.headers.get("x-request-id");
  return candidate && requestIdPattern.test(candidate)
    ? candidate
    : randomUUID();
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);

  if (!isTrustedAdminOrigin(request.headers.get("origin"))) {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.upload",
      level: "warn",
      requestId,
      result: "denied",
    });
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const authorizationResult = await authorizeAdminApiSession({
    roles: ["owner", "editor"],
  });

  if (authorizationResult.status === "denied") {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.upload",
      level: "warn",
      metadata: { reasonCode: authorizationResult.error },
      requestId,
      result: "denied",
    });
    return jsonNoStore(
      { error: authorizationResult.error },
      authorizationResult.statusCode,
    );
  }

  const environment = getMediaEnvironment();

  if (
    !environment ||
    environment.organizationId !==
      authorizationResult.runtime.authorization.organizationId
  ) {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.upload",
      level: "error",
      metadata: {
        dependency: "unknown",
        reasonCode: "environment_unavailable",
      },
      requestId,
      result: "failure",
    });
    return jsonNoStore({ error: "service_unavailable" }, 503);
  }

  const parsedRequest = await parseMediaUploadRequest(request);

  if (parsedRequest.status === "error") {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.upload",
      level: "warn",
      metadata: {
        httpStatus: parsedRequest.statusCode,
        reasonCode: parsedRequest.error,
      },
      requestId,
      result: "denied",
    });
    return jsonNoStore(
      { error: parsedRequest.error },
      parsedRequest.statusCode,
    );
  }

  let image: Awaited<ReturnType<typeof normalizeMediaImage>>;

  try {
    image = await normalizeMediaImage(parsedRequest.file);
  } catch (uploadError) {
    const reasonCode =
      uploadError instanceof MediaImageError
        ? uploadError.code
        : "image_decode_failed";
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.upload",
      level: "warn",
      metadata: { reasonCode },
      requestId,
      result: "denied",
    });
    return jsonNoStore({ error: "invalid_image", reasonCode }, 422);
  }

  const authorization = authorizationResult.runtime.authorization;
  const result = await runPrivateMediaUpload({
    authorization,
    image,
    metadata: parsedRequest.metadata,
    repository: {
      complete: (input) =>
        completePrivateMediaUpload(environment.databaseUrl, input),
      fail: (input) => failPrivateMediaUpload(environment.databaseUrl, input),
      inspect: (input) =>
        getPrivateMediaUploadState(environment.databaseUrl, input),
      markCleanupRequired: (input) =>
        markPrivateMediaCleanupRequired(environment.databaseUrl, input),
      reserve: (input) =>
        reservePrivateMediaUpload(environment.databaseUrl, input),
    },
    requestId,
    storage: createVercelPrivateMediaStorage({
      storeId: environment.privateStoreId,
    }),
    storeId: environment.privateStoreId,
  });

  if (result.status === "failed") {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.media.upload",
      level: "error",
      metadata: {
        dependency:
          result.reasonCode === "database_reservation_failed" ||
          result.reasonCode === "database_finalize_failed" ||
          result.reasonCode === "database_finalize_unconfirmed"
            ? "database"
            : "storage",
        reasonCode: result.reasonCode,
      },
      requestId,
      result:
        result.reasonCode === "storage_cleanup_failed" ? "degraded" : "failure",
    });
    return jsonNoStore({ error: "upload_failed" }, 503);
  }

  const actorIdHash = process.env.BETTER_AUTH_SECRET
    ? createHmac("sha256", process.env.BETTER_AUTH_SECRET)
        .update(authorization.actor.id)
        .digest("base64url")
        .slice(0, 22)
    : undefined;
  logger.log({
    actorIdHash,
    durationMs: Date.now() - startedAt,
    eventCode: "shapewebs.media.upload",
    level: "info",
    metadata: { resourceType: "private_image" },
    requestId,
    result: "success",
  });

  return jsonNoStore(result, 201);
}
