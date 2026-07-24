import { emailAddressSchema } from "@shapewebs/validation";
import { verifyGoogleIdToken } from "better-auth/social-providers";

type GoogleTokenSet = {
  idToken?: string;
};

type GoogleIdTokenVerifier = typeof verifyGoogleIdToken;

function optionalClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createVerifiedGoogleUserInfo(
  audience: string,
  verifyIdToken: GoogleIdTokenVerifier = verifyGoogleIdToken,
) {
  return async (token: GoogleTokenSet) => {
    if (!token.idToken) {
      return null;
    }

    const claims = await verifyIdToken({
      audience,
      token: token.idToken,
    });

    if (!claims) {
      return null;
    }

    const subject = optionalClaim(claims.sub);
    const email = emailAddressSchema.safeParse(claims.email);

    if (!subject || !email.success || claims.email_verified !== true) {
      return null;
    }

    return {
      data: claims,
      user: {
        email: email.data,
        emailVerified: true,
        id: subject,
        image: optionalClaim(claims.picture),
        name: optionalClaim(claims.name),
      },
    };
  };
}
