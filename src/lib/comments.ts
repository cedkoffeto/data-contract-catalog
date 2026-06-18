import { execute, query } from "@/src/lib/db";
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
  }>(
    `SELECT id, contract_slug, user_id, body, parent_id, created_at, edited_at
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
    createdAt: row.created_at,
    editedAt: row.edited_at,
  }));
}

export async function createContractComment(params: {
  contractSlug: string;
  userId: string;
  body: string;
  parentId?: number | null;
}): Promise<ContractComment> {
  await execute(
    `INSERT INTO contract_comments (contract_slug, user_id, body, parent_id)
     VALUES (?, ?, ?, ?)`,
    [params.contractSlug, params.userId, params.body, params.parentId ?? null],
  );

  const rows = await query<{ id: number }>("SELECT MAX(id) AS id FROM contract_comments");
  const id = rows[0]?.id ?? 0;

  const created = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    parent_id: number | null;
    created_at: string;
    edited_at: string | null;
  }>(
    `SELECT id, contract_slug, user_id, body, parent_id, created_at, edited_at
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
    createdAt: row.created_at,
    editedAt: row.edited_at,
  };
}
