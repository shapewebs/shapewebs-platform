import { escapeEmailHtml } from "./lead-template";

export type CustomerAuthEmailInput = {
  kind: "email_verification" | "invitation" | "password_reset";
  portalBaseUrl: string;
  token: string;
};

export function getCustomerAuthActionUrl(
  input: CustomerAuthEmailInput,
): string {
  if (input.kind === "invitation") {
    return new URL(
      `/invite/${encodeURIComponent(input.token)}`,
      input.portalBaseUrl,
    ).toString();
  }

  if (input.kind === "email_verification") {
    return new URL(
      `/verify/${encodeURIComponent(input.token)}`,
      input.portalBaseUrl,
    ).toString();
  }

  const resetCallback = new URL("/reset-password", input.portalBaseUrl);
  const url = new URL(
    `/api/auth/reset-password/${encodeURIComponent(input.token)}`,
    input.portalBaseUrl,
  );
  url.searchParams.set("callbackURL", resetCallback.toString());
  return url.toString();
}

function heading(kind: CustomerAuthEmailInput["kind"]): string {
  if (kind === "invitation") return "Your Shapewebs invitation";
  if (kind === "email_verification") return "Verify your Shapewebs account";
  return "Set your Shapewebs password";
}

export function renderCustomerAuthEmailHtml(
  input: CustomerAuthEmailInput,
): string {
  const url = getCustomerAuthActionUrl(input);
  return [
    `<h1>${heading(input.kind)}</h1>`,
    "<p>This secure link is single-use and time-limited.</p>",
    `<p><a href="${escapeEmailHtml(url)}">Continue securely</a></p>`,
    "<p>If you did not expect this message, do not use the link.</p>",
  ].join("");
}

export function renderCustomerAuthEmailText(
  input: CustomerAuthEmailInput,
): string {
  return [
    heading(input.kind),
    "",
    "This secure link is single-use and time-limited:",
    getCustomerAuthActionUrl(input),
    "",
    "If you did not expect this message, do not use the link.",
  ].join("\n");
}

export function getCustomerAuthEmailSubject(
  kind: CustomerAuthEmailInput["kind"],
): string {
  return heading(kind);
}
