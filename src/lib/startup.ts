import "./logger";

let started = false;

export function ensureStartup() {
  if (started) return;
  started = true;
  console.info("[startup] Prisma migrations are managed via `npm run db:migrate:deploy`");
}
