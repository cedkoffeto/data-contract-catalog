import { prisma } from "@/src/lib/prisma";
import { createNotification } from "@/src/lib/notifications";
import type { ContractComment } from "@/src/lib/types";

export async function listContractComments(contractSlug: string, limit?: number, offset?: number): Promise<ContractComment[]> {
  const rows = await prisma.contractComment.findMany({
    where: { contractSlug },
    include: { fieldRefs: { select: { fieldName: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
    skip: offset,
  });

  return rows.map((row) => ({
    id: row.id,
    contractSlug: row.contractSlug,
    userId: row.userId,
    body: row.body,
    parentId: row.parentId,
    targetFields: row.fieldRefs.map((f) => f.fieldName),
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  }));
}

export function extractMentionedUserIds(body: string): string[] {
  const matches = body.match(/@([\p{L}\p{N}_.-]+)/gu) ?? [];
  return [...new Set(matches.map((match) => match.slice(1)))];
}

export async function recordCommentMentions(commentId: number, mentionedUserIds: string[]): Promise<void> {
  await Promise.allSettled(mentionedUserIds.map((userId) =>
    prisma.commentMention.create({
      data: { commentId, userId },
    }).catch(() => {}),
  ));
}

export async function notifyMentionedUsers(params: {
  contractSlug: string;
  commentId: number;
  mentionedBy: string;
  mentionedUserIds: string[];
}): Promise<void> {
  await Promise.allSettled(
    params.mentionedUserIds
      .filter((userId) => userId !== params.mentionedBy)
      .map((userId) =>
        createNotification({
          userId,
          contractSlug: params.contractSlug,
          type: "mention",
          title: `${params.mentionedBy} mentioned you`,
          message: "Open the notification to jump to the comment.",
          metadata: {
            contractSlug: params.contractSlug,
            commentId: params.commentId,
            mentionedBy: params.mentionedBy,
          },
        }),
      ),
  );
}

export async function getDiscussionSummary(contractSlug: string): Promise<{ commentCount: number; issueCount: number }> {
  const [commentCount, issueCount] = await Promise.all([
    prisma.contractComment.count({ where: { contractSlug } }),
    prisma.contractIssue.count({ where: { contractSlug } }),
  ]);
  return { commentCount, issueCount };
}

export async function deleteContractComment(commentId: number, userId: string): Promise<void> {
  const comment = await prisma.contractComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.userId !== userId) {
    throw new Error("Not authorized to delete this comment");
  }

  await prisma.$transaction(async (tx) => {
    await tx.contractComment.deleteMany({ where: { parentId: commentId } });
    await tx.contractComment.delete({ where: { id: commentId } });
  });
}

export async function recordCommentFieldReferences(commentId: number, fieldNames: string[]): Promise<void> {
  const deduped = [...new Set(fieldNames)];
  if (deduped.length === 0) return;
  await Promise.allSettled(
    deduped.map((name) =>
      prisma.commentFieldReference.create({
        data: { commentId, fieldName: name },
      }).catch(() => {}),
    ),
  );
}

export async function createContractComment(params: {
  contractSlug: string;
  userId: string;
  body: string;
  parentId?: number | null;
  fieldNames?: string[];
}): Promise<ContractComment> {
  const row = await prisma.contractComment.create({
    data: {
      contractSlug: params.contractSlug,
      userId: params.userId,
      body: params.body,
      parentId: params.parentId ?? null,
    },
  });

  if (params.fieldNames?.length) {
    await recordCommentFieldReferences(row.id, params.fieldNames);
  }

  // Notify parent comment author on reply
  if (row.parentId) {
    const parent = await prisma.contractComment.findUnique({
      where: { id: row.parentId },
      select: { userId: true },
    });
    if (parent && parent.userId !== params.userId) {
      await createNotification({
        userId: parent.userId,
        contractSlug: params.contractSlug,
        type: "comment_reply",
        title: `${params.userId} replied to your comment`,
        message: params.body.slice(0, 200),
        metadata: { contractSlug: params.contractSlug, commentId: row.id, parentCommentId: row.parentId },
      });
    }
  }

  return {
    id: row.id,
    contractSlug: row.contractSlug,
    userId: row.userId,
    body: row.body,
    parentId: row.parentId,
    targetFields: params.fieldNames ?? [],
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  };
}
