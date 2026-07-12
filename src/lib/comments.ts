import { execute, get, insertReturning, query } from "@/src/lib/db";
import { createNotification } from "@/src/lib/notifications";
import type { ContractComment } from "@/src/lib/types";

export async function listContractComments(contractSlug: string): Promise<ContractComment[]> {
  const rows = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    parent_id: number | null;
    created_at: string;
    edited_at: string | null;
    target_fields: unknown;
  }>(
    `SELECT c.id, c.contract_slug, c.user_id, c.body, c.parent_id, c.created_at, c.edited_at,
            COALESCE(json_agg(f.field_name) FILTER (WHERE f.field_name IS NOT NULL), '[]') as target_fields
     FROM contract_comments c
     LEFT JOIN comment_field_references f ON f.comment_id = c.id
     WHERE c.contract_slug = ?
     GROUP BY c.id
     ORDER BY c.created_at ASC, c.id ASC`,
    [contractSlug],
  );

  return rows.map((row) => ({
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    parentId: row.parent_id,
    targetFields: row.target_fields as string[] ?? [],
    createdAt: row.created_at,
    editedAt: row.edited_at,
  }));
}

export function extractMentionedUserIds(body: string): string[] {
  const matches = body.match(/@([\p{L}\p{N}_.-]+)/gu) ?? [];
  return [...new Set(matches.map((match) => match.slice(1)))];
}

export async function recordCommentMentions(commentId: number, mentionedUserIds: string[]): Promise<void> {
  await Promise.allSettled(mentionedUserIds.map((userId) =>
    execute(
      `INSERT INTO comment_mentions (comment_id, user_id)
       VALUES (?, ?) ON CONFLICT DO NOTHING`,
      [commentId, userId],
    ),
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
  const [[commentRow], [issueRow]] = await Promise.all([
    query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM contract_comments WHERE contract_slug = ?`,
      [contractSlug],
    ),
    query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM contract_issues WHERE contract_slug = ?`,
      [contractSlug],
    ),
  ]);
  return { commentCount: commentRow?.cnt ?? 0, issueCount: issueRow?.cnt ?? 0 };
}

export async function deleteContractComment(commentId: number, userId: string): Promise<void> {
  const row = await get<{ user_id: string }>(
    `SELECT user_id FROM contract_comments WHERE id = ?`,
    [commentId],
  );

  if (!row) {
    throw new Error("Comment not found");
  }

  if (row.user_id !== userId) {
    throw new Error("Not authorized to delete this comment");
  }

  const childIds = (await query<{ id: number }>(
    `SELECT id FROM contract_comments WHERE parent_id = ?`,
    [commentId],
  )).map((r) => r.id);

  if (childIds.length > 0) {
    const placeholders = childIds.map(() => "?").join(",");
    await execute(`DELETE FROM contract_comments WHERE id IN (${placeholders})`, childIds);
  }
  await execute(`DELETE FROM contract_comments WHERE id = ?`, [commentId]);
}

export async function recordCommentFieldReferences(commentId: number, fieldNames: string[]): Promise<void> {
  const deduped = [...new Set(fieldNames)];
  if (deduped.length === 0) return;
  const placeholders = deduped.map(() => "(?, ?)").join(",");
  const params = deduped.flatMap((name) => [commentId, name]);
  await execute(
    `INSERT INTO comment_field_references (comment_id, field_name) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
    params,
  );
}

export async function createContractComment(params: {
  contractSlug: string;
  userId: string;
  body: string;
  parentId?: number | null;
  fieldNames?: string[];
}): Promise<ContractComment> {
  const rows = await insertReturning<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    parent_id: number | null;
    created_at: string;
    edited_at: string | null;
  }>(
    `INSERT INTO contract_comments (contract_slug, user_id, body, parent_id)
     VALUES (?, ?, ?, ?)
     RETURNING id, contract_slug, user_id, body, parent_id, created_at, edited_at`,
    [params.contractSlug, params.userId, params.body, params.parentId ?? null],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Unable to load created comment");
  }

  if (params.fieldNames?.length) {
    await recordCommentFieldReferences(row.id, params.fieldNames);
  }

  // Notify parent comment author on reply
  if (row.parent_id) {
    const parent = await get<{ user_id: string }>(
      "SELECT user_id FROM contract_comments WHERE id = ?",
      [row.parent_id],
    );
    if (parent && parent.user_id !== params.userId) {
      await createNotification({
        userId: parent.user_id,
        contractSlug: params.contractSlug,
        type: "comment_reply",
        title: `${params.userId} replied to your comment`,
        message: params.body.slice(0, 200),
        metadata: { contractSlug: params.contractSlug, commentId: row.id, parentCommentId: row.parent_id },
      });
    }
  }

  return {
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    parentId: row.parent_id,
    targetFields: params.fieldNames ?? [],
    createdAt: row.created_at,
    editedAt: row.edited_at,
  };
}
