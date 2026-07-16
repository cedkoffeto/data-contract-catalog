export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { getUserContractPreferences, updateUserContractPreferences } from "@/src/lib/preferences";
import { requireApiAuth } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) return apiError("Authentication required", 401);

  const { slug } = await params;
  const isFavorite = await getUserContractPreferences(userId, slug);
  return NextResponse.json({ isFavorite });
}

async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) return apiError("Authentication required", 401);

  const body = (await request.json()) as { isFavorite?: boolean; isPinned?: boolean };
  const preferences = await updateUserContractPreferences(userId, (await params).slug, body);

  return NextResponse.json({ preferences });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
