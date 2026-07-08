import { NextResponse } from "next/server";

export function apiError(error: unknown, status = 500, context?: string): NextResponse {
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  console.error(`[api-error]${context ? " " + context : ""}:`, message);
  return NextResponse.json({ error: message }, { status });
}
