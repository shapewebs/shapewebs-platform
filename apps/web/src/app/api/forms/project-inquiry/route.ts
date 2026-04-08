import { NextRequest, NextResponse } from "next/server";
import {
  buildRateLimitKey,
  consumeRateLimit,
  getClientIp,
  parseProjectInquiryPayload,
  sendSubmissionNotification,
  storeContactSubmission,
  verifyTurnstileToken,
} from "@/lib/forms";

export async function POST(request: NextRequest) {
  const payload = parseProjectInquiryPayload(await request.json());
  const ip = getClientIp(request.headers);
  const rateLimit = consumeRateLimit(
    buildRateLimitKey("project_inquiry", ip, payload.email),
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429 },
    );
  }

  const captcha = await verifyTurnstileToken({
    ip,
    token: request.headers.get("x-turnstile-token"),
  });

  if (!captcha.success) {
    return NextResponse.json(
      { error: "Captcha verification failed." },
      { status: 400 },
    );
  }

  await storeContactSubmission({
    formType: "project_inquiry",
    payload,
    spamScore: captcha.mode === "skipped" ? null : 0,
  });

  await sendSubmissionNotification({
    formType: "project_inquiry",
    payload,
  });

  return NextResponse.json({
    message: "Thanks, your project inquiry has been received.",
  });
}
