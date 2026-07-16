import { logger } from "@/src/lib/logger";

let started = false;

export function ensureStartup() {
  if (started) return;
  started = true;
  logger.info("[startup] Prisma migrations are managed via `npm run db:migrate:deploy`");
}
