import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  consumeContentPreviewGrant,
  consumeSanityContentPreviewGrant,
} from "@shapewebs/database/server";
import { readBoundedText } from "@shapewebs/validation";

import { getPublicSiteOrigin } from "@/lib/content";
import { getPreviewCookiePolicy } from "@/lib/preview-cookie";
import { buildPrivatePreviewPath } from "@/lib/preview-path";
import { parsePreviewGrantToken } from "@/lib/preview-request";

const invalidPreviewResponse = () =>
  NextResponse.json(
    { error: "Invalid or expired preview token." },
    {
      headers: { "Cache-Control": "private, no-store" },
      status: 401,
    },
  );

export async function POST(request: Request) {
  const contentType =
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() ?? "";

  if (contentType !== "application/x-www-form-urlencoded") {
    return NextResponse.json(
      { error: "Unsupported content type." },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 415,
      },
    );
  }

  const body = await readBoundedText(request, 512);

  if (body.status !== "ok") {
    return NextResponse.json(
      { error: "Preview request is too large." },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 413,
      },
    );
  }

  const token = parsePreviewGrantToken(body.value);

  if (!token) {
    return invalidPreviewResponse();
  }

  const databaseUrl = process.env.DATABASE_URL;
  const organizationId = process.env.SHAPEWEBS_ORGANIZATION_ID;

  if (!databaseUrl || !organizationId) {
    return NextResponse.json(
      { error: "Preview is not configured." },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 503,
      },
    );
  }

  let previewGrant;

  try {
    previewGrant = await consumeContentPreviewGrant(
      databaseUrl,
      organizationId,
      token,
    );

    if (!previewGrant) {
      previewGrant = await consumeSanityContentPreviewGrant(
        databaseUrl,
        organizationId,
        token,
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Preview is temporarily unavailable." },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 503,
      },
    );
  }

  if (!previewGrant) {
    return invalidPreviewResponse();
  }

  const previewPath = buildPrivatePreviewPath(previewGrant.path);

  if (!previewPath) {
    return NextResponse.json(
      { error: "Preview destination is invalid." },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 503,
      },
    );
  }

  const production = process.env.NODE_ENV === "production";
  const cookiePolicy = getPreviewCookiePolicy(production);
  const cookieStore = await cookies();
  cookieStore.set(cookiePolicy.name, previewGrant.sessionToken, {
    ...cookiePolicy.attributes,
    maxAge: Math.max(
      1,
      Math.floor(
        (new Date(previewGrant.expiresAt).getTime() - Date.now()) / 1_000,
      ),
    ),
  });

  const redirectUrl = new URL(previewPath, getPublicSiteOrigin());
  return NextResponse.redirect(redirectUrl, {
    headers: { "Cache-Control": "private, no-store" },
    status: 303,
  });
}
