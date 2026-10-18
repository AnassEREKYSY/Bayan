import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { isGuestOnlyPath, isProtectedPath, routes } from "@/lib/routes";
import { buildContentSecurityPolicy } from "@/lib/security";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Runs before every page request:
 *  1. refreshes the Supabase session cookie,
 *  2. guards protected and guest-only routes,
 *  3. attaches a per-request nonce-based Content-Security-Policy.
 */
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildContentSecurityPolicy(
    nonce,
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    {
      isDev: process.env.NODE_ENV === "development",
      upgradeInsecure: publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
    },
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() validates the JWT with Supabase Auth; never trust getSession() on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return withHeaders(NextResponse.redirect(url), response, csp);
  }

  if (user && isGuestOnlyPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.dashboard;
    url.search = "";
    return withHeaders(NextResponse.redirect(url), response, csp);
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/** Keep refreshed auth cookies and the CSP on redirects. */
function withHeaders(redirect: NextResponse, source: NextResponse, csp: string) {
  for (const cookie of source.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.headers.set("Content-Security-Policy", csp);
  return redirect;
}

export const config = {
  matcher: [
    // Skip static files, images and scheduled-job endpoints.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|robots.txt|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
