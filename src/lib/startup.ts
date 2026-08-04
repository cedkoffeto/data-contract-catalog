import { logger } from "@/src/lib/logger";

let started = false;

const REQUIRED_SERVER_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_KEYCLOAK_ID",
  "AUTH_KEYCLOAK_SECRET",
  "AUTH_KEYCLOAK_ISSUER",
  "NEXTAUTH_URL",
] as const;

function validateEnv(): void {
  const errors: string[] = [];

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]?.trim()) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("://")) {
    errors.push("DATABASE_URL must be a valid connection string");
  }

  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
    errors.push("AUTH_SECRET must be at least 32 characters");
  }

  if (errors.length > 0) {
    console.error("\n❌ Environment validation failed:\n");
    for (const e of errors) console.error(`   • ${e}`);
    console.error("\n   Check your .env file or environment configuration.\n");
    process.exit(1);
  }
}

export function ensureStartup() {
  if (started) return;
  started = true;
  validateEnv();
  logger.info("[startup] Environment validated, Prisma migrations are managed via `npm run db:migrate:deploy`");
}
