type SessionReader<Session> = (headers: Headers) => Promise<Session | null>;

function readSetCookies(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithCookies.getSetCookie?.();

  if (setCookies) {
    return setCookies;
  }

  const combinedCookie = headers.get("set-cookie");

  return combinedCookie ? [combinedCookie] : [];
}

function createCookieRequestHeaders(setCookies: string[]): Headers | null {
  const cookieJar = new Map<string, string>();

  for (const setCookie of setCookies) {
    const cookiePair = setCookie.split(";", 1)[0]?.trim();
    const separatorIndex = cookiePair?.indexOf("=") ?? -1;

    if (!cookiePair || separatorIndex <= 0) {
      continue;
    }

    cookieJar.set(
      cookiePair.slice(0, separatorIndex).trim(),
      cookiePair.slice(separatorIndex + 1),
    );
  }

  if (cookieJar.size === 0) {
    return null;
  }

  return new Headers({
    cookie: [...cookieJar]
      .map(([name, value]) => `${name}=${value}`)
      .join("; "),
  });
}

export async function readSignedSessionFromResponse<Session>(
  response: Response,
  readSession: SessionReader<Session>,
): Promise<Session | null> {
  if (!response.ok) {
    return null;
  }

  const cookieHeaders = createCookieRequestHeaders(
    readSetCookies(response.headers),
  );

  return cookieHeaders ? readSession(cookieHeaders) : null;
}
