import { syncRolesFromYaml } from "@/src/lib/rbac-sync";

let started = false;

export function ensureStartup() {
  if (started) return;
  started = true;

  syncRolesFromYaml().catch((error) => {
    console.error("[startup] Failed to sync roles:", error);
  });
}
