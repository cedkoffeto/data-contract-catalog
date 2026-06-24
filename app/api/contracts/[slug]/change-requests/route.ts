export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { authorize } from "@/src/lib/access-control";
import { createChangeRequest, listChangeRequests } from "@/src/lib/change-requests";
import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabFileLastCommitSha } from "@/src/lib/gitlab";
import { createNotification } from "@/src/lib/notifications";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPermissions } from "@/src/lib/rbac";

async function ensureCanReadContract(slug: string, userId: string) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
  }

  const permissions = await getUserPermissions(userId);
  if (permissions.includes("admin")) return null;

  const allowed = await authorize(
    userId,
    contract.data.asset?.domain ?? "",
    contract.data.asset?.context ?? "",
    "read",
    slug,
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, userId);
  if (forbidden) return forbidden;

  const permissions = await getUserPermissions(userId);
  const all = await listChangeRequests();

  // non-admins can only see their own requests
  const items = permissions.includes("admin")
    ? all
    : all.filter((cr) => cr.editorId === userId);

  return NextResponse.json({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, userId);
  if (forbidden) return forbidden;

  const body = (await request.json()) as { yamlContent?: string; message?: string };
  const yamlContent = body.yamlContent?.trim();
  const commitMessage = body.message?.trim() || `Update contract ${slug}`;

  if (!yamlContent) {
    return NextResponse.json({ error: "yamlContent is required" }, { status: 400 });
  }

  if (yamlContent.length > 500000) {
    return NextResponse.json({ error: "yamlContent too large" }, { status: 400 });
  }

  let originalSha: string;
  try {
    originalSha = await getGitLabFileLastCommitSha(slug);
  } catch {
    originalSha = "";
  }

  const cr = await createChangeRequest({
    contractSlug: slug,
    editorId: userId,
    yamlContent,
    originalSha,
    commitMessage,
  });

  // Notify the editor about the created MR
  if (cr.status === "pending" && cr.gitlabMrUrl) {
    await createNotification({
      userId: cr.editorId,
      contractSlug: cr.contractSlug,
      type: "change_request_created",
      title: "Change request submitted",
      message: `Your change request #${cr.id} for ${cr.contractSlug} has been submitted. Merge request: ${cr.gitlabMrUrl}`,
      metadata: { changeRequestId: cr.id, gitlabMrUrl: cr.gitlabMrUrl },
    });
  }

  return NextResponse.json({ changeRequest: cr }, { status: 201 });
}
