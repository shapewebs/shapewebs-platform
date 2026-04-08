import { cookies, draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  consumePreviewToken,
  createAdminSupabaseClient,
} from "@shapewebs/db";
import { getPublicSiteOrigin, previewCookieNames } from "@/lib/content";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const signature = request.nextUrl.searchParams.get("signature");
  const path = request.nextUrl.searchParams.get("path") ?? "/";

  if (!token || !signature) {
    return NextResponse.json({ error: "Missing preview credentials." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: "Preview is not configured." }, { status: 503 });
  }

  const previewSelection = await consumePreviewToken(supabase, {
    token,
    signature,
  });

  if (!previewSelection) {
    return NextResponse.json({ error: "Invalid or expired preview token." }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  const cookieStore = await cookies();
  cookieStore.set(previewCookieNames.documentId, previewSelection.documentId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(previewCookieNames.localeCode, previewSelection.localeCode, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(previewCookieNames.revisionId, previewSelection.revisionId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const redirectUrl = new URL(path.startsWith("/") ? path : "/", getPublicSiteOrigin());
  return NextResponse.redirect(redirectUrl);
}
