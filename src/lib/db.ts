import fs from "node:fs";
import path from "node:path";

import initSqlJs, { type SqlValue, type Database } from "sql.js";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "prisma", "data", "rbac.db");

let _SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let _db: Database | null = null;
let _dbMtime = 0;

async function getSqlModule() {
  if (!_SQL) {
    _SQL = await initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }
  return _SQL;
}

function dbPathMtime(): number {
  try {
    return fs.statSync(DB_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function dbModifiedOnDisk(): boolean {
  return dbPathMtime() !== _dbMtime;
}

async function getDb() {
  const SQL = await getSqlModule();
  if (!_db || dbModifiedOnDisk()) {
    if (_db) _db.close();
    let buffer: Buffer;
    try { buffer = fs.readFileSync(DB_PATH); } catch { buffer = Buffer.alloc(0); }
    _db = new SQL.Database(buffer);
    _dbMtime = dbPathMtime();
  }
  return _db;
}

function persistDb(db: Database) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  _dbMtime = dbPathMtime();
}

/** INSERT with RETURNING — atomic insert + read, avoids last_insert_rowid() race conditions. */
export async function insertReturning<T = Record<string, unknown>>(
  sql: string,
  params?: SqlValue[]
): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  persistDb(db);
  return results;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: SqlValue[]
): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    results.push(row);
  }
  stmt.free();
  return results;
}

export async function execute(
  sql: string,
  params?: SqlValue[]
): Promise<{ changes: number }> {
  const db = await getDb();
  db.run(sql, params);
  const changes = db.getRowsModified();
  persistDb(db);
  return { changes };
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
  const db = await getDb();
  try {
    db.run("BEGIN TRANSACTION");
    await fn();
    db.run("COMMIT");
    persistDb(db);
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
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
