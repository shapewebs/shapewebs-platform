import { getAdminReadiness } from "@/lib/health";

const readinessHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET() {
  const result = await getAdminReadiness();

  return Response.json(
    { status: result.ready ? "ready" : "unavailable" },
    {
      headers: readinessHeaders,
      status: result.ready ? 200 : 503,
    },
  );
}
