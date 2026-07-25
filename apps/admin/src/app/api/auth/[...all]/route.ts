import { toNextJsHandler } from "@shapewebs/auth/server";

import { getAdminAuth } from "@/lib/better-auth";
import { hardenAuthResponse } from "@/lib/auth-response";

const unavailableHandler = async (request: Request) => {
  const auth = getAdminAuth();

  if (!auth) {
    return Response.json(
      { error: "authentication_unavailable" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 503,
      },
    );
  }

  return hardenAuthResponse(request, await auth.handler(request));
};

export const { DELETE, GET, PATCH, POST, PUT } =
  toNextJsHandler(unavailableHandler);
