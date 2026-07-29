import { createHmac, randomUUID } from "node:crypto";

// Keep Sharp in the deployable function root so Vercel traces its native
// runtime for this upload route.
import "sharp";

import { MediaImageError, normalizeMediaImage } from "@shapewebs/media/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";

import { authorizeAdminApiSession } from "@/lib/auth";
import { isTrustedAdminOrigin } from "@/lib/better-auth";
import { parsePublicMediaUploadRequest } from "@/lib/public-media-request";
import { getAdminSanityRuntime } from "@/lib/sanity";

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
      eventCode: "shapewebs.content.public_media_upload",
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
      eventCode: "shapewebs.content.public_media_upload",
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

  const parsedRequest = await parsePublicMediaUploadRequest(request);

  if (parsedRequest.status === "error") {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.content.public_media_upload",
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
  } catch (error) {
    const reasonCode =
      error instanceof MediaImageError ? error.code : "image_decode_failed";
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.content.public_media_upload",
      level: "warn",
      metadata: { reasonCode },
      requestId,
      result: "denied",
    });
    return jsonNoStore({ error: "invalid_image", reasonCode }, 422);
  }

  const sanity = getAdminSanityRuntime();

  if (!sanity) {
    return jsonNoStore({ error: "service_unavailable" }, 503);
  }

  try {
    const asset = await sanity.writeRepository.uploadImage({
      bytes: image.bytes,
      filename: `${randomUUID()}.webp`,
    });
    const authorization = authorizationResult.runtime.authorization;
    const actorIdHash = process.env.BETTER_AUTH_SECRET
      ? createHmac("sha256", process.env.BETTER_AUTH_SECRET)
          .update(authorization.actor.id)
          .digest("base64url")
          .slice(0, 22)
      : undefined;

    logger.log({
      actorIdHash,
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.content.public_media_upload",
      level: "info",
      metadata: {
        resourceType: "public_image",
      },
      requestId,
      result: "success",
    });

    return jsonNoStore(
      {
        asset: {
          height: image.height,
          id: asset._id,
          name: "New public image",
          url: asset.url,
          width: image.width,
        },
        status: "uploaded",
      },
      201,
    );
  } catch {
    logger.log({
      durationMs: Date.now() - startedAt,
      eventCode: "shapewebs.content.public_media_upload",
      level: "error",
      metadata: {
        dependency: "content",
        reasonCode: "provider_upload_failed",
      },
      requestId,
      result: "failure",
    });
    return jsonNoStore({ error: "upload_failed" }, 503);
  }
}
