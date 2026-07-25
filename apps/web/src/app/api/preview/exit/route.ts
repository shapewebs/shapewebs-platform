import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicSiteOrigin } from "@/lib/content";
import { getPreviewCookiePolicy } from "@/lib/preview-cookie";

export async function POST() {
  const cookiePolicy = getPreviewCookiePolicy(
    process.env.NODE_ENV === "production",
  );
  const cookieStore = await cookies();
  cookieStore.set(cookiePolicy.name, "", {
    ...cookiePolicy.attributes,
    expires: new Date(0),
    maxAge: 0,
  });

  return NextResponse.redirect(new URL("/", getPublicSiteOrigin()), {
    headers: { "Cache-Control": "private, no-store" },
    status: 303,
  });
}
