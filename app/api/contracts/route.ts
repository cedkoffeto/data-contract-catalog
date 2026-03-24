import { NextResponse } from "next/server";

import { getCatalogCards } from "@/src/lib/contracts";

export function GET() {
  const items = getCatalogCards().map((card) => ({
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
