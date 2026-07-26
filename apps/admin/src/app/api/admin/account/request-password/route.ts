import { emailAddressSchema, readBoundedText } from "@shapewebs/validation";

import {
  getAdminAuth,
  getAdminBaseUrl,
  isTrustedAdminOrigin,
} from "@/lib/better-auth";

const maximumBodyBytes = 1_024;

function genericResponse() {
  return Response.json(
    { status: "accepted" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (
    !isTrustedAdminOrigin(request.headers.get("origin")) ||
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return Response.json(
      { error: "invalid_request" },
      { headers: { "Cache-Control": "no-store" }, status: 400 },
    );
  }

  const rawBody = await readBoundedText(request, maximumBodyBytes);
  if (rawBody.status !== "ok") {
    return Response.json(
      { error: "invalid_request" },
      { headers: { "Cache-Control": "no-store" }, status: 413 },
    );
  }

  let emailInput: unknown;
  try {
    const body = JSON.parse(rawBody.value) as { email?: unknown };
    emailInput = body.email;
  } catch {
    return genericResponse();
  }

  const email =
    typeof emailInput === "string"
      ? emailAddressSchema.safeParse(emailInput.trim().toLowerCase())
      : null;
  const auth = getAdminAuth();
  const baseUrl = getAdminBaseUrl();

  if (!auth || !baseUrl || !email?.success) {
    return genericResponse();
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

  return genericResponse();
}
