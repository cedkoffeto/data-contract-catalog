export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabContractFilePath, getGitLabFileHistory, isGitLabConfigurationError } from "@/src/lib/gitlab";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { authorize } from "@/src/lib/access-control";

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

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;

  const { slug } = await context.params;
  const contract = await getContractBySlug(slug);

  if (!contract) {
    return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
  }
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contractDomain = contract.data.asset?.domain ?? "";
  const contractCtx = contract.data.asset?.context ?? "";
  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    const allowed = await authorize(userId, contractDomain, contractCtx, "read", slug);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions on this contract" }, { status: 403 });
    }
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
