export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getUserContractPreferences, updateUserContractPreferences } from "@/src/lib/preferences";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { slug } = await params;
  const isFavorite = await getUserContractPreferences(userId, slug);
  return NextResponse.json({ isFavorite });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = (await request.json()) as { isFavorite?: boolean; isPinned?: boolean };
  const preferences = await updateUserContractPreferences(userId, (await params).slug, body);

  return NextResponse.json({ preferences });
}
