import { NextResponse } from "next/server";
import { loadDataModel } from "@/src/lib/data-model-sync";
import { requireApiAuth } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

export const dynamic = "force-dynamic";

async function GET() {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;

  const data = await loadDataModel();
  return NextResponse.json(data);
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
