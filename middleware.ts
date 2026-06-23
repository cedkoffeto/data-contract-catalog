import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set(["/login", "/api/healthz"]);
const AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token"
];

function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.delete(name);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const { pathname, search } = nextUrl;

  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const isAuthRoute = pathname.startsWith("/api/auth");
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  });

  if (pathname === "/login") {
    const response = token ? NextResponse.redirect(new URL("/", nextUrl)) : NextResponse.next();
    return response;
  }

  if (token || isPublicPath || isAuthRoute) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", nextUrl);
  loginUrl.searchParams.set("callbackUrl", pathname.startsWith("/realms/") ? "/" : `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|awb-icon.png|.*\\..*$).*)"]
};
