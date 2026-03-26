import { NextResponse } from "next/server";

import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabFileContent, isGitLabConfigurationError } from "@/src/lib/gitlab";

export async function GET(request: Request, context: { params: { slug: string } }) {
  const slug = context.params.slug;

  if (!(await getContractBySlug(slug))) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref") ?? undefined;
    const payload = await getGitLabFileContent(slug, ref);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load repository file";

    return NextResponse.json(
      { error: message },
      {
        status: isGitLabConfigurationError(error) ? 503 : 500
      }
    );
  }
}
