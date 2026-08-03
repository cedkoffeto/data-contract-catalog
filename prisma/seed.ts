import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_POLICIES: Array<{ userId: string; permission: string }> = [
  { userId: "admin.user", permission: "admin" },
  { userId: "contract.user", permission: "reader" },
  { userId: "editor.user", permission: "editor" },
  { userId: "reader.user", permission: "reader" },
  { userId: "data_owner.user", permission: "reader" },
  ...[1, 2, 3, 4, 5].map((i) => ({ userId: `de${i}`, permission: "reader" })),
];

async function seed() {
  for (const name of ["admin", "editor", "reader"]) {
    await prisma.$executeRawUnsafe(
      "INSERT INTO permissions (name) VALUES ($1) ON CONFLICT DO NOTHING",
      name,
    );
  }
  console.info("[seed] Default permissions seeded (admin, editor, reader)");

  const existing = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
    "SELECT COUNT(*) as c FROM access_policies WHERE user_id IS NOT NULL",
  );
  if (Number(existing[0]?.c ?? 0) > 0) {
    console.info("[seed] Access policies already exist, skipping");
    return;
  }

  for (const { userId, permission } of DEFAULT_POLICIES) {
    const permRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      "SELECT id FROM permissions WHERE name = $1",
      permission,
    );
    if (permRows.length === 0) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO access_policies (user_id, group_id, permission_id, domain_scope, context_scope, data_contract_scope, updated_at)
       VALUES ($1, NULL, $2, NULL, NULL, NULL, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING`,
      userId,
      permRows[0].id,
    );
  }
  console.info(`[seed] Seeded ${DEFAULT_POLICIES.length} default access policies`);
}

seed()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
