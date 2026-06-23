export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { query } from "@/src/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contractSlug = searchParams.get("contractSlug");

  const rows = await query<{ status: string }>(
    `SELECT status FROM access_requests
     WHERE user_id = ? AND data_contract = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, contractSlug ?? ""],
  );

  return NextResponse.json({ status: rows[0]?.status ?? null });
}
