import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH } from "@/modules/auth/constants";

// Admin only. Fast first check: no admin cookie → go to the login page. The cookie is
// NOT trusted here; the admin layout asks the backend to verify it. The shop is public.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSessionCookie = request.cookies.has(ADMIN_COOKIE);
  if (pathname !== ADMIN_LOGIN_PATH && !hasSessionCookie) {
    const login = new URL(ADMIN_LOGIN_PATH, request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
