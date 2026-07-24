import { isIP } from "node:net";

type RequestIdentityEnvironment = {
  NODE_ENV?: string;
  VERCEL?: string;
};

function getFirstValidIp(value: string | null): string | null {
  const firstValue = value?.split(",", 1)[0]?.trim();
  return firstValue && isIP(firstValue) !== 0 ? firstValue : null;
}

export function getClientIp(
  headers: Headers,
  environment: RequestIdentityEnvironment = process.env,
): string {
  if (environment.VERCEL === "1") {
    return getFirstValidIp(headers.get("x-vercel-forwarded-for")) ?? "unknown";
  }

  if (environment.NODE_ENV === "production") {
    return "unknown";
  }

  return (
    getFirstValidIp(headers.get("x-forwarded-for")) ??
    getFirstValidIp(headers.get("x-real-ip")) ??
    "unknown"
  );
}
