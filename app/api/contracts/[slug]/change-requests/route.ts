export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { authorize } from "@/src/lib/access-control";
import { createChangeRequest, listChangeRequests } from "@/src/lib/change-requests";
import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabFileLastCommitSha } from "@/src/lib/gitlab";
import { createNotification } from "@/src/lib/notifications";
import type { Session } from "next-auth";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { getAdminUserIds } from "@/src/lib/rbac";

async function ensureCanReadContract(slug: string, session: Session) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { slug } = await params;
    const forbidden = await ensureCanReadContract(slug, session);
    if (forbidden) return forbidden;

    let body: { yamlContent?: string; message?: string };
    try {
      body = (await request.json()) as { yamlContent?: string; message?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

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

      // Notify all admins
      const adminIds = await getAdminUserIds();
      await Promise.all(
        adminIds.map((adminId) =>
          createNotification({
            userId: adminId,
            contractSlug: cr.contractSlug,
            type: "change_request_created",
            title: "New change request",
            message: `Change request #${cr.id} for ${cr.contractSlug} by ${cr.editorId} is pending review. MR: ${cr.gitlabMrUrl}`,
            metadata: { changeRequestId: cr.id, gitlabMrUrl: cr.gitlabMrUrl, editorId: cr.editorId },
          }),
        ),
      );
    }

    return NextResponse.json({ changeRequest: cr }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[change-requests] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
