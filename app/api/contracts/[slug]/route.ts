import { NextResponse } from "next/server";

import { getContractBySlug } from "@/src/lib/contracts";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const contract = await getContractBySlug(params.slug);

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
