import { cookies, draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { consumeContentPreviewGrant } from "@shapewebs/database/server";
import { getPublicSiteOrigin, previewCookieNames } from "@/lib/content";

const invalidPreviewResponse = () =>
  NextResponse.json(
    { error: "Invalid or expired preview token." },
    {
      headers: { "Cache-Control": "private, no-store" },
      status: 401,
    },
  );

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

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

  const draft = await draftMode();
  draft.enable();

  const cookieStore = await cookies();
  cookieStore.set(previewCookieNames.token, previewGrant.sessionToken, {
    httpOnly: true,
    maxAge: Math.max(
      1,
      Math.floor(
        (new Date(previewGrant.expiresAt).getTime() - Date.now()) / 1_000,
      ),
    ),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const redirectUrl = new URL(previewGrant.path, getPublicSiteOrigin());
  return NextResponse.redirect(redirectUrl);
}
