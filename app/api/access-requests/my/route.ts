export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/auth";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contractSlug = searchParams.get("contractSlug");

  const row = await prisma.accessRequest.findFirst({
    where: { userId, dataContract: contractSlug ?? "" },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });

  return NextResponse.json({ status: row?.status ?? null });
}
