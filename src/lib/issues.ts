import { prisma } from "@/src/lib/prisma";
import type { ContractIssue } from "@/src/lib/types";

export const ISSUE_STATUSES = ["open", "fixed", "false_alert"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

function toContractIssue(r: {
  id: number; contractSlug: string; userId: string; body: string;
  status: string; createdAt: Date; resolvedAt: Date | null;
}): ContractIssue {
  return {
    id: r.id,
    contractSlug: r.contractSlug,
    userId: r.userId,
    body: r.body,
    status: r.status as IssueStatus,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  };
}

export async function getContractIssue(id: number): Promise<ContractIssue | null> {
  const row = await prisma.contractIssue.findUnique({ where: { id } });
  return row ? toContractIssue(row) : null;
}

export async function listContractIssues(contractSlug: string, limit = 200): Promise<ContractIssue[]> {
  const rows = await prisma.contractIssue.findMany({
    where: { contractSlug },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: Math.min(Math.max(1, limit), 500),
  });

  const statusOrder: Record<string, number> = { open: 0, fixed: 1 };
  rows.sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));

  return rows.map(toContractIssue);
}

export async function createContractIssue(params: {
  contractSlug: string;
  userId: string;
  body: string;
}): Promise<ContractIssue> {
  const row = await prisma.contractIssue.create({
    data: {
      contractSlug: params.contractSlug,
      userId: params.userId,
      body: params.body,
    },
  });
  return toContractIssue(row);
}

export async function updateContractIssueStatus(id: number, status: IssueStatus): Promise<ContractIssue> {
  const resolvedAt = status === "open" ? null : new Date();

  const row = await prisma.contractIssue.update({
    where: { id },
    data: { status, resolvedAt },
  });

  return toContractIssue(row);
}
