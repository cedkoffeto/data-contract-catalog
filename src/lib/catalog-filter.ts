import { auth } from "@/src/auth";
import { getUserPermissions, type Permission } from "@/src/lib/rbac";
import type { CatalogCard, ContractFile } from "@/src/lib/types";

const CONFIDENTIAL_CLASSIFICATIONS = ["confidential", "restricted"];

export function filterContractsByPermission<T extends { data: { security?: { classification?: string } } }>(
  contracts: T[],
  permissions: Permission[]
): T[] {
  if (permissions.includes("admin")) return contracts;

  return contracts.filter((contract) => {
    const classification = contract.data.security?.classification ?? "internal";
    if (CONFIDENTIAL_CLASSIFICATIONS.includes(classification)) {
      return permissions.includes("write") || permissions.includes("admin");
    }
    return true;
  });
}

export function canUserEdit(permissions: Permission[]): boolean {
  return permissions.includes("write") || permissions.includes("admin");
}

export async function getSessionPermissions(): Promise<{
  permissions: Permission[];
  canEdit: boolean;
  userName: string | null;
}> {
  const session = await auth();
  const userName = session?.user?.name ?? null;
  const permissions = userName ? await getUserPermissions(userName) : [];

  return {
    permissions,
    canEdit: canUserEdit(permissions),
    userName,
  };
}

export function filterCatalogCards(cards: CatalogCard[], permissions: Permission[]): CatalogCard[] {
  if (permissions.includes("admin")) return cards;

  return cards.filter((card) => {
    const isConfidential = card.searchData.includes("confidential");
    if (isConfidential) {
      return permissions.includes("write") || permissions.includes("admin");
    }
    return true;
  });
}
