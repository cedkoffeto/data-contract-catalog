import { AsyncLocalStorage } from "node:async_hooks";

import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@prisma/client";

const txStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const tx = txStorage.getStore();
  const client = tx ?? prisma;
  return client.$queryRawUnsafe<T[]>(sql, ...(params ?? []));
}

export async function execute(
  sql: string,
  params?: unknown[],
): Promise<{ changes: number }> {
  const tx = txStorage.getStore();
  const client = tx ?? prisma;
  const changes = await client.$executeRawUnsafe(sql, ...(params ?? []));
  return { changes };
}

export async function get<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function exists(
  sql: string,
  params?: unknown[],
): Promise<boolean> {
  const rows = await query<{ c: number }>("SELECT COUNT(*) as c FROM (" + sql + ")", params);
  return (rows[0]?.c ?? 0) > 0;
}

export async function insertReturning<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const tx = txStorage.getStore();
  const client = tx ?? prisma;
  return client.$queryRawUnsafe<T[]>(sql, ...(params ?? []));
}

export type TransactionFn = () => Promise<void>;

export async function transaction(fn: TransactionFn): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await txStorage.run(tx, () => fn());
  });
}

export async function migrate(
  sql: string,
  params?: unknown[],
): Promise<{ changes: number }> {
  const changes = await prisma.$executeRawUnsafe(sql, ...(params ?? []));
  return { changes };
}
