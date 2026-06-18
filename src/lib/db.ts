import fs from "node:fs";
import path from "node:path";

import initSqlJs, { type SqlValue } from "sql.js";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "prisma", "data", "rbac.db");

function shouldLog(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  if (trimmed.startsWith("select") && trimmed.includes("from audit_log")) return false;
  return true;
}

function dbLog(type: string, sql: string, params?: SqlValue[]) {
  if (!shouldLog(sql)) return;
  const msg = params ? `${sql} -- ${JSON.stringify(params)}` : sql;
  console.log(`[db.${type}] ${msg}`);
}

let _SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlModule() {
  if (!_SQL) {
    _SQL = await initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }
  return _SQL;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: SqlValue[]
): Promise<T[]> {
  dbLog("query", sql, params);
  const SQL = await getSqlModule();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  try {
    const stmt = db.prepare(sql);
    if (params) {
      stmt.bind(params);
    }

    const results: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as T;
      results.push(row);
    }
    stmt.free();
    return results;
  } finally {
    db.close();
  }
}

export async function execute(
  sql: string,
  params?: SqlValue[]
): Promise<{ changes: number }> {
  dbLog("execute", sql, params);
  const SQL = await getSqlModule();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  try {
    db.run(sql, params);
    const changes = db.getRowsModified();
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    return { changes };
  } finally {
    db.close();
  }
}

export async function exists(
  sql: string,
  params?: SqlValue[]
): Promise<boolean> {
  const rows = await query<{ c: number }>(`SELECT COUNT(*) as c FROM (${sql})`, params);
  return (rows[0]?.c ?? 0) > 0;
}

export async function get<T = Record<string, unknown>>(
  sql: string,
  params?: SqlValue[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export type TransactionFn = () => Promise<void>;

export async function transaction(fn: TransactionFn): Promise<void> {
  const SQL = await getSqlModule();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  try {
    db.run("BEGIN TRANSACTION");
    await fn();
    db.run("COMMIT");
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function migrate(
  sql: string,
  params?: SqlValue[],
): Promise<{ changes: number }> {
  const SQL = await getSqlModule();
  let buffer: Buffer;
  try { buffer = fs.readFileSync(DB_PATH); } catch { buffer = Buffer.alloc(0); }
  const db = new SQL.Database(buffer);

  try {
    db.run(sql, params);
    const changes = db.getRowsModified();
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    return { changes };
  } finally {
    db.close();
  }
}
