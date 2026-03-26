import { NextResponse } from "next/server";

import { getContractBySlug } from "@/src/lib/contracts";

export function GET(_: Request, { params }: { params: { slug: string } }) {
  const contract = getContractBySlug(params.slug);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: contract.slug,
    stem: contract.stem,
    maturity: contract.maturity,
    fullPath: contract.fullPath,
    yamlRaw: contract.yamlRaw,
    data: contract.data
  });
}
