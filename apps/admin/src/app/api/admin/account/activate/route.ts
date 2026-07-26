import { emailAddressSchema, readBoundedText } from "@shapewebs/validation";

import { getAdminAuth, isTrustedAdminOrigin } from "@/lib/better-auth";

const maximumBodyBytes = 2_048;

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

  let body: { email?: unknown; name?: unknown; password?: unknown };
  try {
    body = JSON.parse(rawBody.value) as typeof body;
  } catch {
    return genericResponse();
  }

  const email =
    typeof body.email === "string"
      ? emailAddressSchema.safeParse(body.email.trim().toLowerCase())
      : null;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const auth = getAdminAuth();

  if (
    !auth ||
    !email?.success ||
    !name ||
    name.length > 120 ||
    password.length < 15 ||
    password.length > 128
  ) {
    return genericResponse();
  }

  try {
    await auth.api.signUpEmail({
      asResponse: true,
      body: {
        callbackURL: "/login?verified=true",
        email: email.data,
        name,
        password,
      },
      headers: request.headers,
    });
  } catch {
    // The response deliberately hides allowlist, account, and password state.
  }

  return genericResponse();
}
