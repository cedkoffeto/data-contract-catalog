export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { createContractComment, deleteContractComment, extractMentionedUserIds, listContractComments, notifyMentionedUsers, recordCommentMentions } from "@/src/lib/comments";
import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import type { Session } from "next-auth";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";

async function ensureCanReadContract(slug: string, session: Session) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
  }

  const userId = session?.user?.name ?? "";
  const permissions = await getGlobalPermissions(session);
  if (permissions.includes("admin")) {
    return null;
  }

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

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 50), 200);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const comments = await listContractComments(slug, limit, offset);
  return NextResponse.json({ comments });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const userId = session.user.name;

  const body = (await request.json()) as { commentId?: number };
  const commentId = body.commentId;

  if (typeof commentId !== "number") {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  try {
    await deleteContractComment(commentId, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete comment";
    const status = message === "Comment not found" ? 404 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  const body = (await request.json()) as { body?: string; parentId?: number | null; targetFields?: string[] };
  const commentBody = body.body?.trim();

  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  if (commentBody.length > 4000) {
    return NextResponse.json({ error: "Comment body is too long" }, { status: 400 });
  }

  const comment = await createContractComment({
    contractSlug: slug,
    userId,
    body: commentBody,
    parentId: body.parentId ?? null,
    fieldNames: body.targetFields ?? [],
  });

  const mentionedUserIds = extractMentionedUserIds(commentBody);
  await Promise.allSettled([
    recordCommentMentions(comment.id, mentionedUserIds),
    notifyMentionedUsers({
      contractSlug: slug,
      commentId: comment.id,
      mentionedBy: userId,
      mentionedUserIds,
    }),
  ]);

  return NextResponse.json({ comment }, { status: 201 });
}
