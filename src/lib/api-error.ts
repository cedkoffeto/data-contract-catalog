import { NextResponse } from "next/server";

const SAFE_MESSAGE_MAP: Record<string, string> = {
  "Path traversal detected": "Invalid file path",
};

export function apiError(error: unknown, status = 500, context?: string): NextResponse {
  const raw = error instanceof Error ? error.message : "An unexpected error occurred";
  const safeKey = Object.keys(SAFE_MESSAGE_MAP).find((k) => raw.startsWith(k));
  const message = safeKey ? SAFE_MESSAGE_MAP[safeKey] : status < 500 ? raw : "Internal server error";
  console.error(`[api-error]${context ? " " + context : ""}:`, raw);
  return NextResponse.json({ error: message }, { status });
}
