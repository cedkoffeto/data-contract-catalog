export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(_req: Request) {
  return NextResponse.json({ status: "ok" });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
