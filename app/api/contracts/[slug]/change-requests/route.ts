export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { authorize } from "@/src/lib/access-control";
import { createChangeRequest, listChangeRequests } from "@/src/lib/change-requests";
import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabFileLastCommitSha } from "@/src/lib/gitlab";
import { createNotification } from "@/src/lib/notifications";
import type { Session } from "next-auth";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { getAdminUserIds } from "@/src/lib/rbac";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function ensureCanReadContract(slug: string, session: Session) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return apiError(`Contract "${slug}" not found`, 404);
  }

  const userId = session?.user?.name ?? "";
  const permissions = await getGlobalPermissions(session);
  if (permissions.includes("admin")) return null;

  const allowed = await authorize(
    userId,
    contract.data.asset?.domain ?? "",
    contract.data.asset?.context ?? "",
    "read",
    slug,
  );

  if (!allowed) {
    return apiError("Forbidden", 403);
  }

  return null;
}

async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  const permissions = await getGlobalPermissions(session);
  const all = await listChangeRequests();

  // non-admins can only see their own requests
  const items = permissions.includes("admin")
    ? all
    : all.filter((cr) => cr.editorId === userId);

  return NextResponse.json({ items });
}

async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  let body: { yamlContent?: string; message?: string };
  try {
    body = (await request.json()) as { yamlContent?: string; message?: string };
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const yamlContent = body.yamlContent?.trim();
  const commitMessage = body.message?.trim() || `Update contract ${slug}`;

  if (!yamlContent) {
    return apiError("yamlContent is required", 400);
  }

  if (yamlContent.length > 500000) {
    return apiError("yamlContent too large", 400);
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

    // Notify the editor about the created CR
    await createNotification({
      userId: cr.editorId,
      contractSlug: cr.contractSlug,
      type: "change_request_created",
      title: "Change request submitted",
      message: cr.gitlabMrUrl
        ? `Your change request #${cr.id} for ${cr.contractSlug} has been submitted. Merge request: ${cr.gitlabMrUrl}`
        : `Your change request #${cr.id} for ${cr.contractSlug} has been submitted (GitLab not configured).`,
      metadata: { changeRequestId: cr.id, ...(cr.gitlabMrUrl ? { gitlabMrUrl: cr.gitlabMrUrl } : {}) },
    });

    // Notify all admins
    const adminIds = await getAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        createNotification({
          userId: adminId,
          contractSlug: cr.contractSlug,
          type: "change_request_created",
          title: "New change request",
          message: cr.gitlabMrUrl
            ? `Change request #${cr.id} for ${cr.contractSlug} by ${cr.editorId} is pending review. MR: ${cr.gitlabMrUrl}`
            : `Change request #${cr.id} for ${cr.contractSlug} by ${cr.editorId} is pending review (GitLab not configured).`,
          metadata: { changeRequestId: cr.id, editorId: cr.editorId, ...(cr.gitlabMrUrl ? { gitlabMrUrl: cr.gitlabMrUrl } : {}) },
        }),
      ),
    );

    return NextResponse.json({ changeRequest: cr }, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500);
  }
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
