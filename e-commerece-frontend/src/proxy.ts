import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH } from "@/modules/auth/constants";
import { CURRENCY_CODE_PATTERN, CURRENCY_COOKIE, DEFAULT_CURRENCY } from "@/modules/currency/constants";

// Runs before every page. Two jobs:
//
// 1. Admin: no admin cookie → go to the login page. (The cookie is NOT trusted here; the admin
//    layout asks the backend to verify it.)
//
// 2. Shop pages: quietly add the shopper's currency to the page's internal address, so
//    /products/red-lehenga is served from the page "/AUD/products/red-lehenga" or
//    "/USD/products/red-lehenga". The address in the browser does not change. This lets each
//    page be built once per currency and kept ready (fast for everyone), instead of being
//    built again for every visitor because it had to read their cookie.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const hasSessionCookie = request.cookies.has(ADMIN_COOKIE);
    if (pathname !== ADMIN_LOGIN_PATH && !hasSessionCookie) {
      const login = new URL(ADMIN_LOGIN_PATH, request.url);
      if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // The internal "/AUD/..." addresses are not for visitors (it would be a second copy of every
  // page in Google). Only the proxy's own rewrite below may reach them.
  const firstSegment = pathname.split("/")[1] ?? "";
  if (CURRENCY_CODE_PATTERN.test(firstSegment)) return new NextResponse("Not found", { status: 404 });

  const wanted = request.cookies.get(CURRENCY_COOKIE)?.value ?? "";
  const currency = CURRENCY_CODE_PATTERN.test(wanted) ? wanted : DEFAULT_CURRENCY;
  const target = request.nextUrl.clone();
  target.pathname = `/${currency}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(target);
}

export const config = {
  // Everything except the account pages, the API, Next's own files and files with an extension
  // (images, icons, robots.txt, sitemap.xml)
  matcher: ["/admin/:path*", "/((?!account|api|_next|.*\\..*).*)"],
};
