import { cookies, draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicSiteOrigin, previewCookieNames } from "@/lib/content";

export async function POST() {
  const draft = await draftMode();
  draft.disable();

  const cookieStore = await cookies();
  cookieStore.delete(previewCookieNames.token);

  return NextResponse.redirect(new URL("/", getPublicSiteOrigin()), 303);
}
