import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getAdminSupabaseConfig } from "@shapewebs/db";

const protectedPrefixes = [
  "/audit",
  "/content",
  "/dashboard",
  "/media",
  "/settings",
  "/submissions",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const config = getAdminSupabaseConfig();

  if (!config) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }

    return new NextResponse("Admin authentication is unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => {
            request.cookies.set(cookie.name, cookie.value);
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (pathname === "/login" && user) {
      const loginUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (user) {
    return response;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", pathname);
  return NextResponse.redirect(loginUrl);
}

export { middleware as proxy };

export const config = {
  matcher: [
    "/audit/:path*",
    "/content/:path*",
    "/dashboard/:path*",
    "/media/:path*",
    "/settings/:path*",
    "/submissions/:path*",
  ],
};
