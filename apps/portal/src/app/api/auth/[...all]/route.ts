import { toNextJsHandler } from "@shapewebs/auth/server";

import { hardenPortalAuthResponse } from "@/lib/auth-response";
import { getPortalAuth } from "@/lib/better-auth";

const portalAuthHandler = async (request: Request) => {
  const auth = getPortalAuth();

  if (!auth) {
    return Response.json(
      { error: "authentication_unavailable" },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }

  return hardenPortalAuthResponse(request, await auth.handler(request));
};

export const { DELETE, GET, PATCH, POST, PUT } =
  toNextJsHandler(portalAuthHandler);
