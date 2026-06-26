import { runMigrations } from "@/src/lib/migrate";

let started = false;
let startupPromise: Promise<void> | null = null;

export function ensureStartup() {
  if (started) return;
  started = true;

  startupPromise = (async () => {
    try {
      await runMigrations();
      console.info("[startup] Initialization complete");
    } catch (error) {
      console.error("[startup] Initialization failed:", error);
    }
  })();
}

export function awaitStartup(): Promise<void> {
  return startupPromise ?? Promise.resolve();
}
