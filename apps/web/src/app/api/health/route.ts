const healthHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET() {
  return Response.json(
    { status: "ok" },
    {
      headers: healthHeaders,
    },
  );
}
