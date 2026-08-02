import { APIError } from "better-auth/api";

export type PasskeyRelyingParty = {
  origin: string;
  rpID: string;
};

export type PasskeyMethodInventory = {
  google: boolean;
  passkeyCount: number;
  password: boolean;
};

type PasskeySessionContext = {
  path?: string;
  request?: Request | null;
};

const passkeyVerificationPath = "/passkey/verify-authentication";
const passkeyVerificationRequestPath =
  "/api/auth/passkey/verify-authentication";

export function getPasskeyRelyingParty(baseUrl: string): PasskeyRelyingParty {
  const origin = new URL(baseUrl);

  return {
    origin: origin.origin,
    rpID: origin.hostname,
  };
}

export function requirePasskeyUserVerification(
  userVerified: boolean | undefined,
): void {
  if (userVerified !== true) {
    throw new APIError("UNAUTHORIZED", {
      message: "Passkey user verification is required.",
    });
  }
}

export function isPasskeyVerifiedSessionCreation(
  context: PasskeySessionContext | null,
): boolean {
  if (
    context?.path !== passkeyVerificationPath ||
    context.request?.method !== "POST"
  ) {
    return false;
  }

  try {
    return (
      new URL(context.request.url).pathname === passkeyVerificationRequestPath
    );
  } catch {
    return false;
  }
}

export function requireRemovablePasskey(methods: PasskeyMethodInventory): void {
  if (!methods.google && !methods.password && methods.passkeyCount <= 1) {
    throw new APIError("FORBIDDEN", {
      message: "Connect another sign-in method before removing this passkey.",
    });
  }
}
