import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { loadDataModel } from "@/src/lib/data-model-sync";
import { requireApiAuth } from "@/src/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;

  try {
    const data = await loadDataModel();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/data-model] Failed to load data model:", error);
    return apiError(error);
  }
}
