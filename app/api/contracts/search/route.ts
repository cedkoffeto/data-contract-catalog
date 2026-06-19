export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { searchCatalogCards } from "@/src/lib/contracts";
import { requireApiAuth } from "@/src/lib/require-auth";
import { filterCatalogCards } from "@/src/lib/catalog-filter";
import { getUserPermissions } from "@/src/lib/rbac";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);

  const cards = await searchCatalogCards({
    q: searchParams.get("q") ?? "",
    domain: searchParams.get("domain") ?? "",
    maturity: searchParams.get("maturity") ?? ""
  });

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
