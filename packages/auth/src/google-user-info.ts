import { emailAddressSchema } from "@shapewebs/validation";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

const googleIdentityIssuers = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

type GoogleTokenSet = {
  idToken?: string;
};

type GoogleIdTokenVerifier = (input: {
  audience: string;
  token: string;
}) => Promise<JWTPayload | null>;

function optionalClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function verifyShapewebsGoogleIdToken(
  input: {
    audience: string;
    token: string;
  },
  resolveKey: JWTVerifyGetKey = googleJwks,
): Promise<JWTPayload | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(
      input.token,
      resolveKey,
      {
        algorithms: ["RS256"],
        audience: input.audience,
        issuer: [...googleIdentityIssuers],
        maxTokenAge: "1h",
        requiredClaims: ["sub", "email", "email_verified", "exp", "iat"],
      },
    );

    return protectedHeader.alg === "RS256" ? payload : null;
  } catch {
    return null;
  }
}

export function createVerifiedGoogleUserInfo(
  audience: string,
  verifyIdToken: GoogleIdTokenVerifier = verifyShapewebsGoogleIdToken,
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
