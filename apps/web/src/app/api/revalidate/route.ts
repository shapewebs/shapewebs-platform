import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { buildRevalidationPayload } from "@/lib/content";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-shapewebs-revalidate-secret");

  if (!secret || secret !== process.env.REVALIDATION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    contentType: "page" | "post" | "project" | "service" | "method" | "legal";
    documentId: string;
    localeCode: string;
    path?: string;
  };

  buildRevalidationPayload(payload).forEach((tag) => {
    revalidateTag(tag, "max");
  });

  if (payload.path && payload.path.startsWith("/")) {
    revalidatePath(payload.path);
  }

  return NextResponse.json({ revalidated: true });
}
