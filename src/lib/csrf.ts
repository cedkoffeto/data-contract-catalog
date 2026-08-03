import { NextResponse } from "next/server";

export function requireCsrf(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const allowedOrigin = process.env.NEXTAUTH_URL ?? "";

  if (!allowedOrigin) {
    return null;
  }

  const allowedOriginNormalized = allowedOrigin.replace(/\/+$/, "").toLowerCase();

  const isValidOrigin = (value: string | null): boolean => {
    if (!value) return false;
    return value.replace(/\/+$/, "").toLowerCase() === allowedOriginNormalized;
  };

  if (!isValidOrigin(origin) && !isValidOrigin(referer)) {
    return NextResponse.json(
      { error: "CSRF validation failed: request origin not allowed" },
      { status: 403 }
    );
  }

  return null;
}
