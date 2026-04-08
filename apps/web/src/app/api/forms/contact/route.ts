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
  const payload = parseContactPayload(await request.json());
  const ip = getClientIp(request.headers);
  const rateLimit = consumeRateLimit(buildRateLimitKey("contact", ip, payload.email));

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
    formType: "contact",
    payload,
    spamScore: captcha.mode === "skipped" ? null : 0,
  });

  await sendSubmissionNotification({
    formType: "contact",
    payload,
  });

  return NextResponse.json({
    message: "Thanks, your message has been received.",
  });
}
