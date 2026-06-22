import { execute, insertReturning, query } from "@/src/lib/db";
import type { ContractIssue } from "@/src/lib/types";

export const ISSUE_STATUSES = ["open", "fixed", "false_alert"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export async function getContractIssue(id: number): Promise<ContractIssue | null> {
  const rows = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    status: IssueStatus;
    created_at: string;
    resolved_at: string | null;
  }>(
    `SELECT id, contract_slug, user_id, body, status, created_at, resolved_at
     FROM contract_issues
     WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export async function listContractIssues(contractSlug: string): Promise<ContractIssue[]> {
  const rows = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    status: IssueStatus;
    created_at: string;
    resolved_at: string | null;
  }>(
    `SELECT id, contract_slug, user_id, body, status, created_at, resolved_at
     FROM contract_issues
     WHERE contract_slug = ?
     ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'fixed' THEN 1 ELSE 2 END ASC, created_at ASC, id ASC`,
    [contractSlug],
  );

  return rows.map((row) => ({
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

export async function createContractIssue(params: {
  contractSlug: string;
  userId: string;
  body: string;
}): Promise<ContractIssue> {
  const rows = await insertReturning<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    status: IssueStatus;
    created_at: string;
    resolved_at: string | null;
  }>(
    `INSERT INTO contract_issues (contract_slug, user_id, body)
     VALUES (?, ?, ?)
     RETURNING id, contract_slug, user_id, body, status, created_at, resolved_at`,
    [params.contractSlug, params.userId, params.body],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Unable to load created issue");
  }

  return {
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export async function updateContractIssueStatus(id: number, status: IssueStatus): Promise<ContractIssue> {
  const resolvedAt = status === "open" ? null : new Date().toISOString();

  await execute(
    `UPDATE contract_issues
     SET status = ?, resolved_at = ?
     WHERE id = ?`,
    [status, resolvedAt, id],
  );

  const rows = await query<{
    id: number;
    contract_slug: string;
    user_id: string;
    body: string;
    status: IssueStatus;
    created_at: string;
    resolved_at: string | null;
  }>(
    `SELECT id, contract_slug, user_id, body, status, created_at, resolved_at
     FROM contract_issues
     WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Issue not found");
  }

  return {
    id: row.id,
    contractSlug: row.contract_slug,
    userId: row.user_id,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}
