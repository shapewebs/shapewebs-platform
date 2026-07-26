import { escapeEmailHtml } from "./lead-template";

export type AdminAuthEmailInput = {
  adminBaseUrl: string;
  kind: "email_verification" | "password_reset";
  token: string;
};

export function getAdminAuthActionUrl(input: AdminAuthEmailInput): string {
  if (input.kind === "email_verification") {
    const url = new URL("/api/auth/verify-email", input.adminBaseUrl);
    url.searchParams.set("token", input.token);
    url.searchParams.set(
      "callbackURL",
      new URL("/login?verified=true", input.adminBaseUrl).toString(),
    );
    return url.toString();
  }

  const resetCallback = new URL("/reset-password", input.adminBaseUrl);
  const url = new URL(
    `/api/auth/reset-password/${encodeURIComponent(input.token)}`,
    input.adminBaseUrl,
  );
  url.searchParams.set("callbackURL", resetCallback.toString());
  return url.toString();
}

function heading(kind: AdminAuthEmailInput["kind"]): string {
  return kind === "email_verification"
    ? "Verify your Shapewebs employee account"
    : "Set your Shapewebs Admin password";
}

export function renderAdminAuthEmailHtml(input: AdminAuthEmailInput): string {
  const url = getAdminAuthActionUrl(input);
  return [
    `<h1>${heading(input.kind)}</h1>`,
    "<p>This administrative link is single-use and expires after one hour.</p>",
    `<p><a href="${escapeEmailHtml(url)}">Continue securely</a></p>`,
    "<p>If you did not expect this message, do not use the link and contact Shapewebs security.</p>",
  ].join("");
}

export function renderAdminAuthEmailText(input: AdminAuthEmailInput): string {
  return [
    heading(input.kind),
    "",
    "This administrative link is single-use and expires after one hour:",
    getAdminAuthActionUrl(input),
    "",
    "If you did not expect this message, do not use the link and contact Shapewebs security.",
  ].join("\n");
}

export function getAdminAuthEmailSubject(
  kind: AdminAuthEmailInput["kind"],
): string {
  return heading(kind);
}
