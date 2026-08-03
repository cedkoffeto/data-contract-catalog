export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
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

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
