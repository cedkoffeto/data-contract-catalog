import { NextResponse } from "next/server";

import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabContractFilePath, getGitLabFileHistory, isGitLabConfigurationError } from "@/src/lib/gitlab";
import { requireApiAuth } from "@/src/lib/require-auth";

function toErrorLogPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    };
  }

  return {
    value: error
  };
}

export async function GET(_request: Request, context: { params: { slug: string } }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const slug = context.params.slug;
  const contract = await getContractBySlug(slug);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  try {
    const items = await getGitLabFileHistory(slug);
    console.info("[contracts.history] Loaded contract history", {
      slug,
      count: items.length,
      firstItem: items[0] ?? null
    });
    return NextResponse.json({ items });
  } catch (error) {
    const filePath = contract.fullPath;
    let contractPath: string | null = null;

    try {
      contractPath = await getGitLabContractFilePath(slug);
    } catch {
      contractPath = null;
    }

    console.error("[contracts.history] Git history lookup failed", {
      slug,
      filePath,
      contractPath,
      ...toErrorLogPayload(error)
    });

    const message = error instanceof Error ? error.message : "Failed to load repository history";

    return NextResponse.json(
      { error: message },
      {
        status: isGitLabConfigurationError(error) ? 503 : 500
      }
    );
  }
}
