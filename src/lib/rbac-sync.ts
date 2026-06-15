import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { execute, query } from "@/src/lib/db";

type RoleYamlEntry = {
  name: string;
  permissions: string[];
  description?: string;
};

type RolesYaml = {
  roles: RoleYamlEntry[];
};

export async function syncRolesFromYaml() {
  const filePath = path.join(process.cwd(), "rbac", "roles.yaml");

  if (!fs.existsSync(filePath)) {
    console.warn("[rbac-sync] roles.yaml not found at", filePath);
    return;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as RolesYaml | null;

  if (!parsed?.roles) {
    console.warn("[rbac-sync] No roles defined in roles.yaml");
    return;
  }

  for (const role of parsed.roles) {
    const existing = await query<{ name: string }>(
      "SELECT name FROM roles WHERE name = ?",
      [role.name]
    );

    if (existing.length > 0) {
      await execute(
        "UPDATE roles SET permissions = ? WHERE name = ?",
        [JSON.stringify(role.permissions), role.name]
      );
    } else {
      await execute(
        "INSERT INTO roles (name, permissions) VALUES (?, ?)",
        [role.name, JSON.stringify(role.permissions)]
      );
    }
  }

  console.info("[rbac-sync] Synced roles from YAML", {
    count: parsed.roles.length,
    roles: parsed.roles.map((r) => r.name),
  });
}
