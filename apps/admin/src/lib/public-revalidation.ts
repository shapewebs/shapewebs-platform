import "server-only";

import { revalidationPayloadSchema } from "@shapewebs/validation";

type PublicRevalidationInput = {
  documentId: string;
  localeCode: string;
  paths: string[];
  vercelOidcToken?: string;
};

type PublicRevalidationRuntime = {
  environment?: NodeJS.ProcessEnv;
  fetchImplementation?: typeof fetch;
};

function getRevalidationEndpoint(environment: NodeJS.ProcessEnv): URL | null {
  const configuredOrigin =
    environment.NEXT_PUBLIC_SITE_URL ??
    (environment.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);

  if (!configuredOrigin) {
    return null;
  }

  try {
    const parsed = new URL(configuredOrigin);
    const isLocalDevelopmentOrigin =
      environment.NODE_ENV === "development" &&
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);

    if (
      parsed.origin !== configuredOrigin ||
      parsed.username ||
      parsed.password ||
      (parsed.protocol !== "https:" && !isLocalDevelopmentOrigin)
    ) {
      return null;
    }

    return new URL("/api/revalidate", parsed.origin);
  } catch {
    return null;
  }
}

function isSafeOidcToken(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 16_384 &&
    !value.includes("\r") &&
    !value.includes("\n")
  );
}

export async function triggerPublicContentRevalidation(
  input: PublicRevalidationInput,
  runtime: PublicRevalidationRuntime = {},
): Promise<boolean> {
  const environment = runtime.environment ?? process.env;
  const endpoint = getRevalidationEndpoint(environment);
  const secret = environment.REVALIDATION_WEBHOOK_SECRET;

  if (!endpoint || !secret || secret.length < 32 || input.paths.length === 0) {
    return false;
  }

  if (
    input.vercelOidcToken !== undefined &&
    !isSafeOidcToken(input.vercelOidcToken)
  ) {
    return false;
  }

  const payloads = [...new Set(input.paths)].map((path) =>
    revalidationPayloadSchema.safeParse({
      contentType: "page",
      documentId: input.documentId,
      localeCode: input.localeCode,
      path,
    }),
  );

  if (payloads.some((payload) => !payload.success)) {
    return false;
  }

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-shapewebs-revalidate-secret": secret,
  };

  if (input.vercelOidcToken) {
    requestHeaders["x-vercel-trusted-oidc-idp-token"] = input.vercelOidcToken;
  }

  const fetchImplementation = runtime.fetchImplementation ?? fetch;

  try {
    const responses = await Promise.all(
      payloads.map((payload) =>
        fetchImplementation(endpoint, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(payload.data),
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(5_000),
        }),
      ),
    );

    return responses.every((response) => response.ok);
  } catch {
    return false;
  }
}
