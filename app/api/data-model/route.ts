import { NextResponse } from "next/server";
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load data model" },
      { status: 500 },
    );
  }
}
