import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set(["/login", "/api/healthz"]);

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX_API = 100;
const RATE_LIMIT_MAX_AUTH = 50;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(request: NextRequest): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const { pathname } = request.nextUrl;
  const max = pathname.startsWith("/api/auth") ? RATE_LIMIT_MAX_AUTH : RATE_LIMIT_MAX_API;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60_000);

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
}

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

  if (pathname.startsWith("/api") && rateLimit(request)) {
    const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    addSecurityHeaders(res);
    return res;
  }

  const isApiRoute = pathname.startsWith("/api");
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isApiRoute && isMutation && !pathname.startsWith("/api/auth")) {
    try {
      csrfGuard(method, request);
    } catch {
      const res = NextResponse.json(
        { error: "CSRF validation failed: request origin not allowed" },
        { status: 403 }
      );
      addSecurityHeaders(res);
      return res;
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
    addSecurityHeaders(response);
    return response;
  }

  if (token || isPublicPath || isAuthRoute) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  const loginUrl = new URL("/login", nextUrl);
  loginUrl.searchParams.set("callbackUrl", pathname.startsWith("/realms/") ? "/" : `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  addSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|awb-icon.png|.*\\..*$).*)"]
};
