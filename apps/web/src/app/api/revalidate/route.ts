import { createHash, timingSafeEqual } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  readBoundedText,
  revalidationPayloadSchema,
} from "@shapewebs/validation";
import { buildRevalidationPayload } from "@/lib/content";

const maximumRevalidationBodyBytes = 2_048;

function secretsMatch(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(actualDigest, expectedDigest);
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-shapewebs-revalidate-secret");
  const expectedSecret = process.env.REVALIDATION_WEBHOOK_SECRET;

  if (!secret || !expectedSecret || !secretsMatch(secret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415 },
    );
  }

  const body = await readBoundedText(request, maximumRevalidationBodyBytes);

  if (body.status === "too_large") {
    return NextResponse.json(
      { error: "Request body is too large." },
      { status: 413 },
    );
  }

  let untrustedPayload: unknown;

  try {
    untrustedPayload = JSON.parse(body.value);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = revalidationPayloadSchema.safeParse(untrustedPayload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid revalidation request." },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  buildRevalidationPayload(payload).forEach((tag) => {
    revalidateTag(tag, "max");
  });

  if (payload.path) {
    revalidatePath(payload.path);
  }

  return NextResponse.json({ revalidated: true });
}
