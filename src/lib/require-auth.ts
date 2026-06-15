import { NextResponse } from "next/server";

import { auth } from "@/src/auth";

export async function requireApiAuth() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return null;
}
