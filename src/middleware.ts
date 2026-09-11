import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/auth/callback"];

function redirectWithCookies(
  url: string,
  request: NextRequest,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(new URL(url, request.url));
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user } = await updateSession(request);
    const pathname = request.nextUrl.pathname;

    if (pathname === "/") {
      const url = user ? "/dashboard" : "/login";
      return redirectWithCookies(url, request, supabaseResponse);
    }

    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (!user && !isPublicRoute) {
      return redirectWithCookies("/login", request, supabaseResponse);
    }

    if (user && pathname === "/login") {
      return redirectWithCookies("/dashboard", request, supabaseResponse);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
