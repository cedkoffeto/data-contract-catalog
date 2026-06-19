import { execute, query } from "@/src/lib/db";
import { createNotification } from "@/src/lib/notifications";
import type { ContractComment } from "@/src/lib/types";

export async function listContractComments(contractSlug: string): Promise<ContractComment[]> {
  const rows = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    parent_id: number | null;
    target_field: string | null;
    created_at: string;
    edited_at: string | null;
  }>(
    `SELECT id, contract_slug, user_id, body, parent_id, target_field, created_at, edited_at
     FROM contract_comments
     WHERE contract_slug = ?
     ORDER BY created_at ASC, id ASC`,
    [contractSlug],
  );

  return rows.map((row) => ({
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    parentId: row.parent_id,
    targetField: row.target_field,
    createdAt: row.created_at,
    editedAt: row.edited_at,
  }));
}

export function extractMentionedUserIds(body: string): string[] {
  const matches = body.match(/@([A-Za-z0-9_.-]+)/g) ?? [];
  return [...new Set(matches.map((match) => match.slice(1)))];
}

export async function recordCommentMentions(commentId: number, mentionedUserIds: string[]): Promise<void> {
  for (const userId of mentionedUserIds) {
    await execute(
      `INSERT OR IGNORE INTO comment_mentions (comment_id, user_id)
       VALUES (?, ?)`,
      [commentId, userId],
    );
  }
}

export async function notifyMentionedUsers(params: {
  contractSlug: string;
  commentId: number;
  mentionedBy: string;
  mentionedUserIds: string[];
}): Promise<void> {
  for (const userId of params.mentionedUserIds) {
    if (userId === params.mentionedBy) continue;

    await createNotification({
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
    });
  }
}

export async function createContractComment(params: {
  contractSlug: string;
  userId: string;
  body: string;
  parentId?: number | null;
  targetField?: string | null;
}): Promise<ContractComment> {
  await execute(
    `INSERT INTO contract_comments (contract_slug, user_id, body, parent_id, target_field)
     VALUES (?, ?, ?, ?, ?)`,
    [params.contractSlug, params.userId, params.body, params.parentId ?? null, params.targetField ?? null],
  );

  const rows = await query<{ id: number }>("SELECT MAX(id) AS id FROM contract_comments");
  const id = rows[0]?.id ?? 0;

  const created = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    parent_id: number | null;
    target_field: string | null;
    created_at: string;
    edited_at: string | null;
  }>(
    `SELECT id, contract_slug, user_id, body, parent_id, target_field, created_at, edited_at
     FROM contract_comments
     WHERE id = ?`,
    [id],
  );

  const row = created[0];
  if (!row) {
    throw new Error("Unable to load created comment");
  }

  return {
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    parentId: row.parent_id,
    targetField: row.target_field,
    createdAt: row.created_at,
    editedAt: row.edited_at,
  };
}
