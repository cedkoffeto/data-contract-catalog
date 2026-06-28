import { NextResponse } from "next/server";
import { loadDataModel } from "@/src/lib/data-model-sync";

export const dynamic = "force-dynamic";

export async function GET() {
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
