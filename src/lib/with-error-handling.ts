import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: Request, ctx?: any) => Promise<Response | NextResponse>;

export function withErrorHandling<T extends RouteHandler>(handler: T): T {
  return (async (req: Request, ctx?: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      console.error(`[route-error] ${req.method} ${new URL(req.url).pathname}:`, e);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }) as T;
}
