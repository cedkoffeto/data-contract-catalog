import { NextResponse } from "next/server";

import { searchCatalogCards } from "@/src/lib/contracts";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const items = searchCatalogCards({
    q: searchParams.get("q") ?? "",
    domain: searchParams.get("domain") ?? "",
    maturity: searchParams.get("maturity") ?? ""
  }).map((card) => ({
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
