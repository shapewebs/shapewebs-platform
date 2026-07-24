import { toNextJsHandler } from "@shapewebs/auth/server";

import { getAdminAuth } from "@/lib/better-auth";

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

  return auth.handler(request);
};

export const { DELETE, GET, PATCH, POST, PUT } =
  toNextJsHandler(unavailableHandler);
