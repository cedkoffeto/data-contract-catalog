import { prisma } from "@/src/lib/prisma";
import { writeAuditLog } from "@/src/lib/audit";
import { createNotification } from "@/src/lib/notifications";

export type PermissionName = "admin" | "editor" | "reader";

const CACHE_TTL = 60_000;
const CACHE_MAX_SIZE = 500;

function effectivePermissionsCacheKey(userId: string, domain: string, context: string, dataContract?: string) {
  return `${userId}|${domain}|${context}|${dataContract ?? ""}`;
}

const effectivePermissionsCache = new Map<string, { promise: Promise<PermissionName[]>; ts: number }>();

function getCachedPermissions(key: string): Promise<PermissionName[]> | undefined {
  const entry = effectivePermissionsCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.promise;
  effectivePermissionsCache.delete(key);
  return undefined;
}

function setCachedPermissions(key: string, promise: Promise<PermissionName[]>): void {
  if (effectivePermissionsCache.size >= CACHE_MAX_SIZE) {
    effectivePermissionsCache.clear();
  }
  effectivePermissionsCache.set(key, { promise, ts: Date.now() });
}

function clearPermissionsCache(): void {
  effectivePermissionsCache.clear();
}

type PermissionRow = {
  id: number;
  name: string;
};

/**
 * Maps application actions to required permission levels.
 * Hierarchy: admin > editor > reader
 */
const ACTION_HIERARCHY: Record<string, PermissionName> = {
  admin: "admin",
  write: "editor",
  read: "reader",
} as const;

const PERMISSION_RANK: Record<PermissionName, number> = {
  admin: 3,
  editor: 2,
  reader: 1,
};

/**
 * Returns the set of effective permission names for a user on a specific
 * (domain, context, dataContract) contract, following the inheritance rules:
 *
 *   Level 1 (Global)        : all three IS NULL
 *   Level 2 (Domain)        : domain_scope = target, context IS NULL, data_contract IS NULL
 *   Level 3 (Context)       : domain_scope + context_scope match, data_contract IS NULL
 *   Level 4 (Data Contract) : all three match
 *
 * Results are deduplicated and, if admin is present, returned as [ 'admin' ].
 */
export async function getEffectivePermissions(
  userId: string,
  domain: string,
  context: string,
  dataContract?: string,
): Promise<PermissionName[]> {
  const key = effectivePermissionsCacheKey(userId, domain, context, dataContract);
  const cached = getCachedPermissions(key);
  if (cached) return cached;

  const lcDomain = domain.toLowerCase().trim();
  const lcContext = context.toLowerCase().trim();
  const lcDataContract = dataContract?.toLowerCase().trim();

  const scopeOr: Record<string, unknown>[] = [
    { domainScope: null, contextScope: null, dataContractScope: null },
    { domainScope: { equals: lcDomain, mode: "insensitive" }, contextScope: null, dataContractScope: null },
    { domainScope: { equals: lcDomain, mode: "insensitive" }, contextScope: { equals: lcContext, mode: "insensitive" }, dataContractScope: null },
  ];
  if (lcDataContract) {
    scopeOr.push(
      { domainScope: { equals: lcDomain, mode: "insensitive" }, contextScope: { equals: lcContext, mode: "insensitive" }, dataContractScope: { equals: lcDataContract, mode: "insensitive" } },
      { domainScope: null, contextScope: null, dataContractScope: { equals: lcDataContract, mode: "insensitive" } },
      { domainScope: { equals: lcDomain, mode: "insensitive" }, contextScope: null, dataContractScope: { equals: lcDataContract, mode: "insensitive" } },
    );
  }

  const promise = prisma.accessPolicy.findMany({
    where: {
      AND: [
        { OR: [{ userId }, { group: { members: { some: { userId } } } }] },
        { OR: scopeOr },
      ],
    },
    include: { permission: { select: { name: true } } },
    distinct: ["permissionId"],
  }).then((rows) => {
    const names = rows.map((r) => r.permission.name) as PermissionName[];
    return names.includes("admin") ? ["admin"] as PermissionName[] : names;
  });

  setCachedPermissions(key, promise);
  return promise;
}

/**
 * Checks whether a user has the required action level on a given contract.
 *
 * Hierarchy:
 *   - 'admin'  can do everything
 *   - 'editor' can read + write
 *   - 'reader' can only read
 */
export async function authorize(
  userId: string,
  domain: string,
  context: string,
  requiredAction: "read" | "write" | "admin",
  dataContract?: string,
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId, domain, context, dataContract);

  if (effective.includes("admin")) return true;

  const minRequired = ACTION_HIERARCHY[requiredAction];
  const requiredRank = PERMISSION_RANK[minRequired];

  for (const perm of effective) {
    if (PERMISSION_RANK[perm] >= requiredRank) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Scope relation helpers
// ---------------------------------------------------------------------------

type ScopeRelation = "same" | "broader" | "narrower" | "disjoint";

function computeScopeRelation(
  newDomain: string | null,
  newContext: string | null,
  newDataContract: string | null,
  existingDomain: string | null,
  existingContext: string | null,
  existingDataContract: string | null,
): ScopeRelation {
  if (newDomain === existingDomain && newContext === existingContext && newDataContract === existingDataContract) return "same";

  const newCoversExisting =
    (newDomain === null || newDomain === existingDomain) &&
    (newContext === null || newContext === existingContext) &&
    (newDataContract === null || newDataContract === existingDataContract);

  const existingCoversNew =
    (existingDomain === null || existingDomain === newDomain) &&
    (existingContext === null || existingContext === newContext) &&
    (existingDataContract === null || existingDataContract === newDataContract);

  if (newCoversExisting) return "broader";
  if (existingCoversNew) return "narrower";
  return "disjoint";
}

function formatScope(domain: string | null, context: string | null, dataContract?: string | null): string {
  if (domain === null && context === null && !dataContract) return "all domains & contexts";
  if (context === null && !dataContract) return `domain: ${domain}`;
  if (dataContract) return `${domain} / ${context} / ${dataContract}`;
  return `${domain} / ${context}`;
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export type ConflictInfo = {
  type: "duplicate" | "weaker" | "overlap" | "broader" | "narrower";
  message: string;
  existing: AccessPolicyRecord;
};

const PERMISSION_NAMES: Record<number, PermissionName> = {};

async function getPermissionRank(id: number): Promise<number> {
  if (!PERMISSION_NAMES[id]) {
    const row = await prisma.permission.findUnique({ where: { id }, select: { name: true } });
    PERMISSION_NAMES[id] = row?.name as PermissionName;
  }
  return PERMISSION_RANK[PERMISSION_NAMES[id]] ?? 0;
}

/**
 * Returns a list of existing policies that conflict with the proposed one.
 *
 * Scope + permission comparison (new vs existing):
 *   - same scope + same permission  → duplicate   → refuse
 *   - same scope + new weaker       → weaker      → refuse
 *   - same scope + new stronger     → overlap     → confirm → update old
 *   - new broader scope + new ≥ old → broader     → confirm → extend old
 *   - new broader scope + new < old → allowed     (additive weaker access)
 *   - new narrower scope + old ≥ new → narrower   → refuse
 *   - new narrower scope + old < new → allowed    (upgrade on that scope)
 */
export async function checkPolicyConflicts(params: {
  userId: string | null;
  groupId: number | null;
  permissionId: number;
  domainScope: string | null;
  contextScope: string | null;
  dataContractScope?: string | null;
  excludeId?: number;
}): Promise<ConflictInfo | null> {
  const { userId, groupId, permissionId, domainScope, contextScope, dataContractScope, excludeId } = params;

  const existing = (await prisma.accessPolicy.findMany({
    where: {
      AND: [
        // Compare only policies of the SAME entity (exactly one of userId/groupId).
        // Using `OR: [{ userId }, { groupId }]` is wrong: with groupId === null Prisma
        // matches every row where groupId IS NULL (all direct user policies).
        ...(userId != null ? [{ userId }] : [{ groupId }]),
        ...(excludeId ? [{ id: { not: excludeId } }] : []),
      ],
    },
    include: { permission: { select: { name: true, id: true } } },
    orderBy: { id: "asc" },
  })).map((r) => ({
    id: r.id,
    user_id: r.userId,
    group_id: r.groupId ?? null,
    group_name: null,
    permission_id: r.permissionId,
    permission_name: r.permission.name,
    domain_scope: r.domainScope ?? null,
    context_scope: r.contextScope ?? null,
    data_contract_scope: r.dataContractScope ?? null,
  }));

  if (existing.length === 0) return null;

  const newDomain = domainScope ?? null;
  const newContext = contextScope ?? null;
  const newDataContract = dataContractScope ?? null;
  const newRank = await getPermissionRank(permissionId);

  for (const policy of existing) {
    const scopeRel = computeScopeRelation(
      newDomain, newContext, newDataContract,
      policy.domain_scope ?? null,
      policy.context_scope ?? null,
      policy.data_contract_scope ?? null,
    );

    const existingRank = PERMISSION_RANK[policy.permission_name as PermissionName] ?? 0;

    if (scopeRel === "same") {
      if (policy.permission_id === permissionId) {
        return {
          type: "duplicate",
          message: `An identical policy (${policy.permission_name}) already exists on this scope.`,
          existing: policy,
        };
      }

      if (existingRank > newRank) {
        return {
          type: "weaker",
          message: `This policy would be weaker than the existing ${policy.permission_name} policy on the same scope and would have no effect.`,
          existing: policy,
        };
      }

      if (existingRank < newRank) {
        return {
          type: "overlap",
          message: `A weaker policy (${policy.permission_name}) already exists on this scope. It will be upgraded to ${PERMISSION_NAMES[permissionId]}.`,
          existing: policy,
        };
      }
    } else if (scopeRel === "broader") {
      // New covers a wider scope. Only redundant if it is at least as strong:
      // the existing narrower policy then becomes fully covered → extend it.
      // A broader-but-weaker new policy is additive (grants weaker access on
      // the extra scope) and leaves the narrower stronger policy useful.
      if (newRank >= existingRank) {
        return {
          type: "broader",
          message: `This policy covers a wider scope (${formatScope(newDomain, newContext, newDataContract)}) than the existing ${policy.permission_name} policy on ${formatScope(policy.domain_scope, policy.context_scope, policy.data_contract_scope)}. The existing policy will be extended.`,
          existing: policy,
        };
      }
    } else if (scopeRel === "narrower") {
      // Existing covers the new scope. Only redundant if the existing policy
      // is at least as strong. A narrower-but-stronger new policy (e.g.
      // editor on one domain while a broader reader policy exists) upgrades
      // access on that scope → must be allowed.
      if (existingRank >= newRank) {
        return {
          type: "narrower",
          message: `A broader policy (${policy.permission_name}) already exists on ${formatScope(policy.domain_scope, policy.context_scope, policy.data_contract_scope)} which already covers this narrower scope.`,
          existing: policy,
        };
      }
    }
  }

  return null;
}

/**
 * Returns IDs of all policies for a user/group that have a narrower scope
 * than the given (domain, context). Used to clean up redundant policies
 * when a broader policy replaces them.
 */
export async function findNarrowerPolicies(
  userId: string | null,
  groupId: number | null,
  domainScope: string | null,
  contextScope: string | null,
  dataContractScope: string | null,
  excludeId: number,
): Promise<number[]> {
  const rows = await prisma.accessPolicy.findMany({
    where: {
      AND: [
        ...(userId != null ? [{ userId }] : [{ groupId }]),
        { id: { not: excludeId } },
      ],
    },
    select: { id: true, domainScope: true, contextScope: true, dataContractScope: true },
  });

  const newDomain = domainScope ?? null;
  const newContext = contextScope ?? null;
  const newDataContract = dataContractScope ?? null;
  const narrower: number[] = [];

  for (const row of rows) {
    const rel = computeScopeRelation(
      newDomain, newContext, newDataContract,
      row.domainScope ?? null,
      row.contextScope ?? null,
      row.dataContractScope ?? null,
    );
    if (rel === "broader") {
      narrower.push(row.id);
    }
  }

  return narrower;
}

// ---------------------------------------------------------------------------
// CRUD helpers for access_policies
// ---------------------------------------------------------------------------

export async function listPermissions(): Promise<PermissionRow[]> {
  const rows = await prisma.permission.findMany({ orderBy: { id: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export type AccessPolicyRecord = {
  id: number;
  user_id: string | null;
  group_id: number | null;
  group_name: string | null;
  permission_id: number;
  permission_name: string;
  domain_scope: string | null;
  context_scope: string | null;
  data_contract_scope: string | null;
};

export async function listAccessPolicies(): Promise<AccessPolicyRecord[]> {
  const rows = await prisma.accessPolicy.findMany({
    include: {
      permission: { select: { name: true } },
      group: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    user_id: r.userId,
    group_id: r.groupId,
    group_name: r.group?.name ?? null,
    permission_id: r.permissionId,
    permission_name: r.permission.name,
    domain_scope: r.domainScope,
    context_scope: r.contextScope,
    data_contract_scope: r.dataContractScope,
  }));
}

export async function getAccessPolicy(id: number): Promise<AccessPolicyRecord | null> {
  const r = await prisma.accessPolicy.findUnique({
    where: { id },
    include: { permission: { select: { name: true } } },
  });
  if (!r) return null;
  return {
    id: r.id,
    user_id: r.userId,
    group_id: r.groupId,
    group_name: null,
    permission_id: r.permissionId,
    permission_name: r.permission.name,
    domain_scope: r.domainScope,
    context_scope: r.contextScope,
    data_contract_scope: r.dataContractScope,
  };
}

async function getPolicyAffectedUserIds(userId: string | null, groupId: number | null): Promise<string[]> {
  if (userId) return [userId];
  if (groupId) return listGroupMembers(groupId);
  return [];
}

function policyChangeMessage(permissionName: string, domainScope: string | null, contextScope: string | null, dataContractScope: string | null): string {
  const parts: string[] = [];
  if (dataContractScope) parts.push(`contract: ${dataContractScope}`);
  if (domainScope) parts.push(`domain: ${domainScope}`);
  if (contextScope) parts.push(`context: ${contextScope}`);
  return parts.length > 0 ? `${permissionName} on ${parts.join(", ")}` : permissionName;
}

/**
 * Creates a new fine-grained access policy.
 * Either `userId` or `groupId` must be provided (but not both).
 */
export async function createAccessPolicy(params: {
  userId: string | null;
  groupId: number | null;
  permissionId: number;
  domainScope: string | null;
  contextScope: string | null;
  dataContractScope?: string | null;
  actorId: string;
  force?: boolean;
  sessionId?: string;
}): Promise<AccessPolicyRecord> {
  const { userId, groupId, permissionId, domainScope, contextScope, dataContractScope, actorId, force, sessionId } = params;

  if ((userId === null) === (groupId === null)) {
    throw new Error("Exactly one of userId or groupId must be provided");
  }

  if (force) {
    const conflict = await checkPolicyConflicts({
      userId, groupId, permissionId, domainScope, contextScope, dataContractScope,
    });
    if (conflict?.type === "overlap" || conflict?.type === "broader") {
      if (conflict.type === "broader") {
        const narrowerIds = await findNarrowerPolicies(
          userId, groupId, domainScope ?? null, contextScope ?? null, dataContractScope ?? null, conflict.existing.id,
        );
        await Promise.allSettled(narrowerIds.map(async (id) => {
          await prisma.accessPolicy.delete({ where: { id } });
          await writeAuditLog({
            action: "policy.delete",
            actorId,
            targetType: "policy",
            targetId: String(id),
            details: { replacedBy: `broader policy #${conflict.existing.id}` },
            sessionId,
          });
        }));
      }
      return await updateAccessPolicy({
        id: conflict.existing.id,
        permissionId,
        domainScope: domainScope ?? null,
        contextScope: contextScope ?? null,
        dataContractScope: dataContractScope ?? null,
        actorId,
        sessionId,
      });
    }
  }

  const created = await prisma.accessPolicy.create({
    data: {
      userId: userId ?? null,
      groupId: groupId ?? null,
      permissionId,
      domainScope: domainScope ?? null,
      contextScope: contextScope ?? null,
      dataContractScope: dataContractScope ?? null,
    },
  });
  const newId = created.id;

  await writeAuditLog({
    action: "policy.create",
    actorId,
    targetType: "policy",
    targetId: String(newId),
    details: { userId, groupId, permissionId, domainScope, contextScope, dataContractScope },
    sessionId,
  });

  clearPermissionsCache();

  const newPolicy = await getAccessPolicy(newId);
  if (newPolicy) {
    const affectedUserIds = await getPolicyAffectedUserIds(userId, groupId);
    await Promise.allSettled(
      affectedUserIds.map((uid) =>
        createNotification({
          userId: uid,
          contractSlug: newPolicy.data_contract_scope ?? "",
          type: "policy_updated",
          title: "Access policy created",
          message: `You have been granted ${policyChangeMessage(newPolicy.permission_name, newPolicy.domain_scope, newPolicy.context_scope, newPolicy.data_contract_scope)}`,
          metadata: { policyId: newPolicy.id, permissionName: newPolicy.permission_name },
        }),
      ),
    );
  }

  return newPolicy!;
}

export async function updateAccessPolicy(params: {
  id: number;
  permissionId: number;
  domainScope: string | null;
  contextScope: string | null;
  dataContractScope?: string | null;
  actorId: string;
  sessionId?: string;
}): Promise<AccessPolicyRecord> {
  const { id, permissionId, domainScope, contextScope, dataContractScope, actorId, sessionId } = params;

  const oldPolicy = await getAccessPolicy(id);

  await prisma.accessPolicy.update({
    where: { id },
    data: { permissionId, domainScope, contextScope, dataContractScope: dataContractScope ?? null },
  });

  await writeAuditLog({
    action: "policy.update",
    actorId,
    targetType: "policy",
    targetId: String(id),
    details: { permissionId, domainScope, contextScope, dataContractScope },
    sessionId,
  });

  clearPermissionsCache();

  const updatedPolicy = await getAccessPolicy(id);
  if (updatedPolicy && oldPolicy) {
    const affectedUserIds = await getPolicyAffectedUserIds(oldPolicy.user_id, oldPolicy.group_id);
    await Promise.allSettled(
      affectedUserIds.map((uid) =>
        createNotification({
          userId: uid,
          contractSlug: updatedPolicy.data_contract_scope ?? "",
          type: "policy_updated",
          title: "Access policy updated",
          message: `Your access changed to ${policyChangeMessage(updatedPolicy.permission_name, updatedPolicy.domain_scope, updatedPolicy.context_scope, updatedPolicy.data_contract_scope)}`,
          metadata: { policyId: updatedPolicy.id, permissionName: updatedPolicy.permission_name },
        }),
      ),
    );
  }

  return updatedPolicy!;
}

export async function deleteAccessPolicy(params: {
  id: number;
  actorId: string;
  sessionId?: string;
}): Promise<void> {
  const oldPolicy = await getAccessPolicy(params.id);

  await prisma.accessPolicy.delete({ where: { id: params.id } });

  await writeAuditLog({
    action: "policy.delete",
    actorId: params.actorId,
    targetType: "policy",
    targetId: String(params.id),
      sessionId: params.sessionId,
  });

  clearPermissionsCache();

  if (oldPolicy) {
    const affectedUserIds = await getPolicyAffectedUserIds(oldPolicy.user_id, oldPolicy.group_id);
    await Promise.allSettled(
      affectedUserIds.map((uid) =>
        createNotification({
          userId: uid,
          contractSlug: oldPolicy.data_contract_scope ?? "",
          type: "policy_updated",
          title: "Access policy removed",
          message: `Your access (${policyChangeMessage(oldPolicy.permission_name, oldPolicy.domain_scope, oldPolicy.context_scope, oldPolicy.data_contract_scope)}) has been revoked`,
          metadata: { policyId: oldPolicy.id, permissionName: oldPolicy.permission_name },
        }),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Group helpers
// ---------------------------------------------------------------------------

export async function listGroups(): Promise<{ id: number; name: string }[]> {
  return prisma.group.findMany({ orderBy: { name: "asc" } });
}

export async function createGroup(params: { name: string; actorId: string; sessionId?: string }): Promise<{ id: number; name: string }> {
  const group = await prisma.group.create({ data: { name: params.name } });

  await writeAuditLog({
    action: "group.create",
    actorId: params.actorId,
    targetType: "group",
    targetId: params.name,
    sessionId: params.sessionId,
  });

  return { id: group.id, name: group.name };
}

export async function deleteGroup(params: { id: number; actorId: string; sessionId?: string }): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { name: true } });
  await prisma.group.delete({ where: { id: params.id } });

  await writeAuditLog({
    action: "group.delete",
    actorId: params.actorId,
    targetType: "group",
    targetId: group?.name ?? String(params.id),
    sessionId: params.sessionId,
  });
}

export async function addUserToGroup(params: {
  userId: string;
  groupId: number;
  actorId: string;
  sessionId?: string;
}): Promise<void> {
  await prisma.userGroup.create({
    data: { userId: params.userId, groupId: params.groupId },
  }).catch(() => {});

  await writeAuditLog({
    action: "group.add_member",
    actorId: params.actorId,
    targetType: "group",
    targetId: String(params.groupId),
    details: { userId: params.userId },
    sessionId: params.sessionId,
  });

  const group = await prisma.group.findUnique({ where: { id: params.groupId }, select: { name: true } });
  const groupName = group?.name ?? `group #${params.groupId}`;
  await createNotification({
    userId: params.userId,
    contractSlug: "",
    type: "group_membership",
    title: "Added to group",
    message: `User ${params.userId} has been added to the group "${groupName}" by ${params.actorId}`,
    metadata: { groupId: params.groupId, groupName, userId: params.userId },
  });
}

export async function removeUserFromGroup(params: {
  userId: string;
  groupId: number;
  actorId: string;
  sessionId?: string;
}): Promise<void> {
  await prisma.userGroup.delete({
    where: { userId_groupId: { userId: params.userId, groupId: params.groupId } },
  }).catch(() => {});

  await writeAuditLog({
    action: "group.remove_member",
    actorId: params.actorId,
    targetType: "group",
    targetId: String(params.groupId),
    details: { userId: params.userId },
    sessionId: params.sessionId,
  });

  const group = await prisma.group.findUnique({ where: { id: params.groupId }, select: { name: true } });
  const groupName = group?.name ?? `group #${params.groupId}`;
  await createNotification({
    userId: params.userId,
    contractSlug: "",
    type: "group_membership",
    title: "Removed from group",
    message: `User ${params.userId} has been removed from the group "${groupName}" by ${params.actorId}`,
    metadata: { groupId: params.groupId, groupName, userId: params.userId },
  });
}

export async function listGroupMembers(groupId: number): Promise<string[]> {
  const rows = await prisma.userGroup.findMany({
    where: { groupId },
    orderBy: { userId: "asc" },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function listAllGroupMemberships(): Promise<
  Array<{ group_id: number; group_name: string; user_id: string }>
> {
  const rows = await prisma.userGroup.findMany({
    include: { group: { select: { name: true } } },
    orderBy: [{ group: { name: "asc" } }, { userId: "asc" }],
  });
  return rows.map((r) => ({
    group_id: r.groupId,
    group_name: r.group.name,
    user_id: r.userId,
  }));
}

export async function getEffectivePoliciesForUser(userId: string): Promise<AccessPolicyRecord[]> {
  const rows = await prisma.accessPolicy.findMany({
    where: {
      OR: [
        { userId },
        { group: { members: { some: { userId } } } },
      ],
    },
    include: {
      permission: { select: { name: true } },
      group: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    user_id: r.userId,
    group_id: r.groupId,
    group_name: r.group?.name ?? null,
    permission_id: r.permissionId,
    permission_name: r.permission.name,
    domain_scope: r.domainScope,
    context_scope: r.contextScope,
    data_contract_scope: r.dataContractScope,
  }));
}
