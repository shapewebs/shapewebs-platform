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
  let payload: ReturnType<typeof parseProjectInquiryPayload>;

  try {
    payload = parseProjectInquiryPayload(await request.json());
  } catch {
    return NextResponse.json(
      { error: "The project inquiry payload is invalid." },
      { status: 400 },
    );
  }

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
      {
        error:
          captcha.mode === "unconfigured"
            ? "The project inquiry form is temporarily unavailable."
            : "Captcha verification failed.",
      },
      { status: captcha.mode === "unconfigured" ? 503 : 400 },
    );
  }

  const submission = await storeContactSubmission({
    formType: "project_inquiry",
    payload,
    spamScore: captcha.mode === "skipped" ? null : 0,
  });

  if (!submission.stored) {
    return NextResponse.json(
      { error: "The project inquiry form is temporarily unavailable." },
      { status: 503 },
    );
  }

  await sendSubmissionNotification({
    formType: "project_inquiry",
    payload,
  });

  return NextResponse.json({
    message: "Thanks, your project inquiry has been received.",
  });
}
