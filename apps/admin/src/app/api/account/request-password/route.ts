import { emailAddressSchema, readBoundedText } from "@shapewebs/validation";

import {
  getAdminAuth,
  getAdminBaseUrl,
  isTrustedAdminOrigin,
} from "@/lib/better-auth";
import {
  getAccountRequestIp,
  verifyAccountTurnstile,
} from "@/lib/account-turnstile";

const maximumBodyBytes = 4_096;

function jsonNoStore(
  body: { error: string } | { status: "accepted" },
  status = 200,
) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(request: Request) {
  if (
    !isTrustedAdminOrigin(request.headers.get("origin")) ||
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const rawBody = await readBoundedText(request, maximumBodyBytes);
  if (rawBody.status !== "ok") {
    return jsonNoStore({ error: "invalid_request" }, 413);
  }

  let emailInput: unknown;
  let turnstileToken: unknown;
  try {
    const body = JSON.parse(rawBody.value) as {
      email?: unknown;
      turnstileToken?: unknown;
    };
    emailInput = body.email;
    turnstileToken = body.turnstileToken;
  } catch {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  const email =
    typeof emailInput === "string"
      ? emailAddressSchema.safeParse(emailInput.trim().toLowerCase())
      : null;
  const token = typeof turnstileToken === "string" ? turnstileToken : null;
  const auth = getAdminAuth();
  const baseUrl = getAdminBaseUrl();

  if (
    !auth ||
    !baseUrl ||
    !email?.success ||
    !(await verifyAccountTurnstile({
      action: "customer_recovery",
      ip: getAccountRequestIp(request),
      token,
    }))
  ) {
    return jsonNoStore({ error: "invalid_request" }, 400);
  }

  try {
    await auth.api.requestPasswordReset({
      asResponse: true,
      body: {
        email: email.data,
        redirectTo: `${baseUrl}/reset-password`,
      },
      headers: request.headers,
    });
  } catch {
    // Unknown, unauthorized, and provider-failure cases remain indistinguishable.
  }

  return jsonNoStore({ status: "accepted" });
}
