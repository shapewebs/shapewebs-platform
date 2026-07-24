import { NextRequest, NextResponse } from "next/server";
import {
  buildRateLimitKey,
  consumeRateLimit,
  getClientIp,
  parseContactPayload,
  sendSubmissionNotification,
  storeContactSubmission,
  verifyTurnstileToken,
} from "@/lib/forms";

export async function POST(request: NextRequest) {
  let payload: ReturnType<typeof parseContactPayload>;

  try {
    payload = parseContactPayload(await request.json());
  } catch {
    return NextResponse.json(
      { error: "The contact form payload is invalid." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const rateLimit = consumeRateLimit(
    buildRateLimitKey("contact", ip, payload.email),
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
            ? "The contact form is temporarily unavailable."
            : "Captcha verification failed.",
      },
      { status: captcha.mode === "unconfigured" ? 503 : 400 },
    );
  }

  const submission = await storeContactSubmission({
    formType: "contact",
    payload,
    spamScore: captcha.mode === "skipped" ? null : 0,
  });

  if (!submission.stored) {
    return NextResponse.json(
      { error: "The contact form is temporarily unavailable." },
      { status: 503 },
    );
  }

  await sendSubmissionNotification({
    formType: "contact",
    payload,
  });

  return NextResponse.json({
    message: "Thanks, your message has been received.",
  });
}
