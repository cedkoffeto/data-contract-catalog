import fs from "node:fs";
import path from "node:path";

import initSqlJs, { type SqlValue } from "sql.js";

const DB_PATH = path.join(process.cwd(), "prisma", "data", "rbac.db");

let _SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlModule() {
  if (!_SQL) {
    _SQL = await initSqlJs({
      locateFile: (file: string) =>
        path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }
  return _SQL;
}

/**
 * Runs a single SQL statement or multiple statements separated by semicolons.
 * Opens the DB once, runs all statements, saves once — optimized for migrations.
 */
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
