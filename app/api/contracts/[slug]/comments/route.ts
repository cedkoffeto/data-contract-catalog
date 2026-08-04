export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/src/lib/api-error";

import { auth } from "@/src/auth";
import { createContractComment, deleteContractComment, extractMentionedUserIds, listContractComments, notifyMentionedUsers, recordCommentMentions } from "@/src/lib/comments";
import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import type { Session } from "next-auth";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

const CommentCreateSchema = z.object({
  body: z.string().min(1, "Comment body is required").max(4000),
  parentId: z.number().int().nullable().optional(),
  targetFields: z.array(z.string().max(200)).max(20).optional(),
});

const CommentDeleteSchema = z.object({
  commentId: z.number().int(),
});

async function ensureCanReadContract(slug: string, session: Session) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return apiError(`Contract "${slug}" not found`, 404);
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
    return apiError("Forbidden", 403);
  }

  return null;
}

async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
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

async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.name) {
    return apiError("Authentication required", 401);
  }
  const userId = session.user.name;

  const parsed = CommentDeleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  await deleteContractComment(parsed.data.commentId, userId);
  return NextResponse.json({ success: true });
}

async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  const parsed = CommentCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  const { body: commentBody, parentId, targetFields } = parsed.data;

  const comment = await createContractComment({
    contractSlug: slug,
    userId,
    body: commentBody,
    parentId: parentId ?? null,
    fieldNames: targetFields ?? [],
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

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const DELETE_handler = withErrorHandling(DELETE);
export { DELETE_handler as DELETE };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
