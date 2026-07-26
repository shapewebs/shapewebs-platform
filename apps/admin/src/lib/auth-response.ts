const clearAuthenticatedSiteData = '"cache", "cookies", "storage"';

export function readAuthSetCookies(headers: Headers): string[] {
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

export function hardenAuthResponse(
  request: Request,
  response: Response,
): Response {
  const pathname = new URL(request.url).pathname;

  if (
    request.method !== "POST" ||
    pathname !== "/api/auth/sign-out" ||
    !response.ok
  ) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Clear-Site-Data", clearAuthenticatedSiteData);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
