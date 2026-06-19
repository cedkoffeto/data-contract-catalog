export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getCatalogCards } from "@/src/lib/contracts";
import { filterCatalogCards } from "@/src/lib/catalog-filter";
import { getUserPermissions } from "@/src/lib/rbac";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getUserPermissions(userId);
  const cards = await getCatalogCards();
  const filtered = await filterCatalogCards(userId, cards, permissions);
  const items = filtered.map((card) => ({
    slug: card.slug,
    title: card.title,
    version: card.version,
    owner: card.owner,
    description: card.description,
    maturity: card.maturity,
    domain: card.domain,
    url: card.href
  }));

  return NextResponse.json({ items });
}
