import { NextResponse } from "next/server";

type RouteHandler = (req: Request, ctx?: { params?: Record<string, string> }) => Promise<Response | NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      console.error(`[route-error] ${req.method} ${new URL(req.url).pathname}:`, e);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
