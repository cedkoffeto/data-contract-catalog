import { prisma } from "@/src/lib/prisma";

export type Permission = "read" | "write" | "admin";

export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  if (userPermissions.includes("admin")) return true;
  return userPermissions.includes(required);
}

export function canWrite(userPermissions: Permission[]): boolean {
  return hasPermission(userPermissions, "write");
}

export function canAdmin(userPermissions: Permission[]): boolean {
  return userPermissions.includes("admin");
}

export async function getAdminUserIds(): Promise<string[]> {
  const [directUsers, groupUsers] = await Promise.all([
    prisma.accessPolicy.findMany({
      where: { permission: { name: "admin" }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.userGroup.findMany({
      where: { group: { policies: { some: { permission: { name: "admin" } } } } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const ids = new Set<string>();
  for (const u of directUsers) if (u.userId) ids.add(u.userId);
  for (const u of groupUsers) ids.add(u.userId);
  return Array.from(ids);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const policy = await prisma.accessPolicy.findFirst({
    where: {
      permission: { name: "admin" },
      OR: [
        { userId },
        { group: { members: { some: { userId } } } },
      ],
    },
  });
  return policy !== null;
}

export async function getUserIdsWithScopeAccess(domain: string, context: string): Promise<string[]> {
  const [directUsers, groupUsers] = await Promise.all([
    prisma.accessPolicy.findMany({
      where: {
        permission: { name: { not: "admin" } },
        userId: { not: null },
        OR: [
          { domainScope: null, contextScope: null },
          { domainScope: domain, contextScope: null },
          { domainScope: domain, contextScope: context },
        ],
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.userGroup.findMany({
      where: {
        group: {
          policies: {
            some: {
              permission: { name: { not: "admin" } },
              OR: [
                { domainScope: null, contextScope: null },
                { domainScope: domain, contextScope: null },
                { domainScope: domain, contextScope: context },
              ],
            },
          },
        },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const ids = new Set<string>();
  for (const u of directUsers) if (u.userId) ids.add(u.userId);
  for (const u of groupUsers) ids.add(u.userId);
  return Array.from(ids);
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const policies = await prisma.accessPolicy.findMany({
    where: {
      OR: [
        { userId },
        { group: { members: { some: { userId } } } },
      ],
      domainScope: null,
      contextScope: null,
      dataContractScope: null,
    },
    select: { permission: { select: { name: true } } },
    distinct: ["permissionId"],
  });

  const permissionMap: Record<string, Permission> = {
    admin: "admin",
    editor: "write",
    reader: "read",
  };

  const merged = new Set<Permission>();
  for (const p of policies) {
    const mapped = permissionMap[p.permission.name];
    if (mapped) merged.add(mapped);
  }

  return Array.from(merged);
}

type KcUser = { username: string };

async function searchKeycloakUsers(queryStr: string): Promise<string[]> {
  const issuer = (process.env.AUTH_KEYCLOAK_ISSUER ?? "").trim();
  if (!issuer) return [];

  const kcBase = issuer.replace(/\/realms\/.*$/, "");
  const realm = issuer.split("/").pop() ?? "data-contracts";
  const adminUser = process.env.KC_ADMIN;
  const adminPass = process.env.KC_ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return [];

  try {
    const tokenRes = await fetch(`${kcBase}/realms/master/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: adminUser,
        password: adminPass,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!tokenRes.ok) return [];

    const { access_token } = await tokenRes.json();
    const q = queryStr ? `?search=${encodeURIComponent(queryStr)}` : "?first=0&max=100";
    const userRes = await fetch(
      `${kcBase}/admin/realms/${realm}/users${q}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!userRes.ok) return [];

    const users: KcUser[] = await userRes.json();
    return users.map((u) => u.username).filter(Boolean);
  } catch {
    return [];
  }
}

export async function searchAllUsers(queryStr: string): Promise<Array<{ userId: string; email?: string | null }>> {
  const [userGroupIds, policyIds] = await Promise.all([
    prisma.userGroup.findMany({
      where: { userId: { contains: queryStr, mode: "insensitive" } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.accessPolicy.findMany({
      where: { userId: { not: null, contains: queryStr, mode: "insensitive" } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const seen = new Set<string>();
  const localUsers: Array<{ userId: string; email?: string | null }> = [];

  for (const u of userGroupIds) {
    if (!seen.has(u.userId)) {
      seen.add(u.userId);
      localUsers.push({ userId: u.userId, email: null });
    }
  }
  for (const u of policyIds) {
    if (u.userId && !seen.has(u.userId)) {
      seen.add(u.userId);
      localUsers.push({ userId: u.userId, email: null });
    }
  }

  const keycloakUsers = await searchKeycloakUsers(queryStr);

  for (const u of keycloakUsers) {
    if (!seen.has(u)) {
      localUsers.push({ userId: u, email: null });
      seen.add(u);
    }
  }

  return localUsers.sort((a, b) => a.userId.localeCompare(b.userId));
}
