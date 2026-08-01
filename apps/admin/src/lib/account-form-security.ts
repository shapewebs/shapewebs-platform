import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { readBoundedText } from "@shapewebs/validation";

import { getAdminBaseUrl, hasAdminAuthConfig } from "./auth-environment";

export type AccountFormAction =
  "customer_invitation" | "customer_registration" | "customer_verification";

const tokenLifetimeMs = 15 * 60 * 1_000;
const maximumFormBytes = 16 * 1_024;
const tokenPattern =
  /^v1\.([a-z_]{3,40})\.([0-9]{13})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;

function getFormSecret(): string | null {
  const secret = process.env.BETTER_AUTH_SECRET;
  return hasAdminAuthConfig() && secret && secret.length >= 32 ? secret : null;
}

function signPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createAccountFormToken(
  action: AccountFormAction,
  now = Date.now(),
): string {
  const secret = getFormSecret();

  if (!secret) {
    throw new Error("Shapewebs account form security is unavailable.");
  }

  const payload = `v1.${action}.${now}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${signPayload(payload, secret).toString("base64url")}`;
}

function verifyAccountFormToken(
  token: string,
  action: AccountFormAction,
  now = Date.now(),
): boolean {
  const secret = getFormSecret();
  const match = tokenPattern.exec(token);

  if (!secret || !match || match[1] !== action) {
    return false;
  }

  const issuedAt = Number(match[2]);
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + 60_000 ||
    issuedAt < now - tokenLifetimeMs
  ) {
    return false;
  }

  const payload = token.slice(0, token.lastIndexOf("."));
  const suppliedSignature = Buffer.from(match[4] ?? "", "base64url");
  const expectedSignature = signPayload(payload, secret);

  return (
    suppliedSignature.length === expectedSignature.length &&
    timingSafeEqual(suppliedSignature, expectedSignature)
  );
}

export async function readSecureAccountForm(
  request: Request,
  action: AccountFormAction,
): Promise<
  | { params: URLSearchParams; status: "ok" }
  | { status: "invalid" | "too_large" | "unavailable" }
> {
  const expectedOrigin = getAdminBaseUrl();
  if (!expectedOrigin) {
    return { status: "unavailable" };
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    request.headers.get("origin") !== expectedOrigin ||
    (fetchSite !== null && !["same-origin", "none"].includes(fetchSite)) ||
    request.headers.get("content-type")?.split(";", 1)[0] !==
      "application/x-www-form-urlencoded"
  ) {
    return { status: "invalid" };
  }

  const body = await readBoundedText(request, maximumFormBytes);
  if (body.status !== "ok") {
    return { status: "too_large" };
  }

  const params = new URLSearchParams(body.value);
  const csrfToken = getSingleAccountFormValue(params, "csrfToken", 512);

  return csrfToken && verifyAccountFormToken(csrfToken, action)
    ? { params, status: "ok" }
    : { status: "invalid" };
}

export function getSingleAccountFormValue(
  params: URLSearchParams,
  name: string,
  maximumLength: number,
): string | null {
  const values = params.getAll(name);
  if (values.length !== 1 || values[0]!.length > maximumLength) {
    return null;
  }

  return values[0] ?? null;
}

export function accountRedirectResponse(
  request: Request,
  pathname: string,
  setCookies: string[] = [],
): Response {
  const destination = new URL(pathname, request.url);
  const headers = new Headers({
    "Cache-Control": "no-store",
    Location: destination.toString(),
  });

  for (const cookie of setCookies) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(null, { headers, status: 303 });
}

export function accountFormErrorResponse(
  request: Request,
  pathname: string,
  status: "invalid" | "too_large" | "unavailable",
): Response {
  const code = status === "unavailable" ? "unavailable" : "invalid_request";
  return accountRedirectResponse(
    request,
    `${pathname}${pathname.includes("?") ? "&" : "?"}error=${code}`,
  );
}
