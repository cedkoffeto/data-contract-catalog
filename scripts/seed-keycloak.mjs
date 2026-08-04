// Seed Keycloak users — reads users from keycloak/realm-export.json
// Usage: node scripts/seed-keycloak.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const KC_BASE = process.env.KC_BASE_URL || "http://localhost:8080";
const KC_REALM = process.env.KC_REALM || "data-contracts";
const KC_ADMIN_USER = process.env.KC_ADMIN || "admin";
const KC_ADMIN_PASS = process.env.KC_ADMIN_PASSWORD || "admin";

const REALM_EXPORT_PATH = path.join(ROOT, "keycloak", "realm-export.json");

function loadUsers() {
  if (!fs.existsSync(REALM_EXPORT_PATH)) {
    console.error(`[keycloak-seed] ERROR: ${REALM_EXPORT_PATH} not found`);
    process.exit(1);
  }

  const raw = fs.readFileSync(REALM_EXPORT_PATH, "utf-8");
  const data = JSON.parse(raw);
  const users = data.users ?? [];

  if (users.length === 0) {
    console.warn("[keycloak-seed] No users found in realm-export.json");
  }

  return users.map((u) => ({
    username: u.username,
    firstName: u.firstName ?? u.username,
    lastName: u.lastName ?? "",
    email: u.email ?? `${u.username}@example.com`,
    password: u.credentials?.[0]?.value ?? "password",
  }));
}

async function waitForKeycloak() {
  process.stdout.write("[keycloak-seed] Waiting for Keycloak...");
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${KC_BASE}/realms/master`, { signal: AbortSignal.timeout(2000) });
      console.log(" ready!");
      return;
    } catch {
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error("\n[keycloak-seed] ERROR: Keycloak did not start in time");
  process.exit(1);
}

async function getAdminToken() {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: KC_ADMIN_USER,
      password: KC_ADMIN_PASS,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get admin token: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function kcAdmin(method, path, body, token) {
  const res = await fetch(`${KC_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  const text = await res.text().catch(() => "");
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  await waitForKeycloak();

  console.log("[keycloak-seed] Getting admin token...");
  const adminToken = await getAdminToken();

  // Load users from realm-export.json
  const USERS = loadUsers();
  console.log(`[keycloak-seed] Found ${USERS.length} user(s) in realm-export.json`);

  // Create/reset users
  for (const user of USERS) {
    process.stdout.write(`  ${user.username}... `);

    const search = await kcAdmin(
      "GET",
      `/admin/realms/${KC_REALM}/users?username=${encodeURIComponent(user.username)}`,
      null,
      adminToken
    );

    let userId = null;
    if (search.ok && Array.isArray(search.data) && search.data.length > 0) {
      userId = search.data[0].id;
    }

    if (userId) {
      const pw = await kcAdmin(
        "PUT",
        `/admin/realms/${KC_REALM}/users/${userId}/reset-password`,
        { type: "password", value: user.password, temporary: false },
        adminToken
      );
      console.log(pw.ok ? "password reset OK" : `password reset FAILED (HTTP ${pw.status})`);
    } else {
      const create = await kcAdmin(
        "POST",
        `/admin/realms/${KC_REALM}/users`,
        {
          username: user.username,
          enabled: true,
          emailVerified: true,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          credentials: [{ type: "password", value: user.password, temporary: false }],
        },
        adminToken
      );
      console.log(create.ok ? "created OK" : `create FAILED (HTTP ${create.status})`);
    }
  }

  // Verify
  console.log("[keycloak-seed] Verifying logins...");
  let allOk = true;
  for (const user of USERS) {
    const test = await fetch(`${KC_BASE}/realms/${KC_REALM}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: user.username,
        password: user.password,
      }),
    });
    const ok = test.ok ? "OK" : "FAIL";
    if (!test.ok) allOk = false;
    console.log(`  ${user.username}: ${ok}`);
  }

  if (allOk) {
    console.log("[keycloak-seed] ✅ All users ready");
  } else {
    console.log("[keycloak-seed] ⚠️ Some users failed");
  }
}

main().catch((err) => {
  console.error("\n[keycloak-seed] ERROR:", err.message);
  process.exit(1);
});
