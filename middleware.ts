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

function csrfGuard(method: string, request: NextRequest): void {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer")?.split("?")[0] ?? null;

  const allowedOriginRaw = process.env.NEXTAUTH_URL ?? "";
  if (!allowedOriginRaw) return;

  const allowed = allowedOriginRaw.replace(/\/+$/, "").toLowerCase();

  const matchOrigin = (value: string | null): boolean => {
    if (!value) return false;
    return value.replace(/\/+$/, "").toLowerCase() === allowed;
  };

  if (!matchOrigin(origin) && !matchOrigin(referer)) {
    throw new Error("CSRF origin mismatch");
  }
}

export async function middleware(request: NextRequest) {
  const { nextUrl, method } = request;
  const { pathname, search } = nextUrl;

  const isApiRoute = pathname.startsWith("/api");
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isApiRoute && isMutation && !pathname.startsWith("/api/auth")) {
    try {
      csrfGuard(method, request);
    } catch {
      return NextResponse.json(
        { error: "CSRF validation failed: request origin not allowed" },
        { status: 403 }
      );
    }
  }

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
