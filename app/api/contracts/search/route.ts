import { NextResponse } from "next/server";

import { searchCatalogCards } from "@/src/lib/contracts";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);

  const cards = await searchCatalogCards({
    q: searchParams.get("q") ?? "",
    domain: searchParams.get("domain") ?? "",
    maturity: searchParams.get("maturity") ?? ""
  });

  const items = cards.map((card) => ({
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
