import { runMigrations } from "@/src/lib/migrate";

let started = false;

export function ensureStartup() {
  if (started) return;
  started = true;

  (async () => {
    try {
      await runMigrations();
      console.info("[startup] Initialization complete");
    } catch (error) {
      console.error("[startup] Initialization failed:", error);
    }
  })();
}
