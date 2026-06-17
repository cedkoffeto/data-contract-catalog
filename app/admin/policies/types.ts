export type Policy = {
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

export type Permission = {
  id: number;
  name: string;
};

export type Group = {
  id: number;
  name: string;
};

export type Scope = {
  domain: string;
  context: string;
};

export type ConflictDialog = {
  body: Record<string, unknown>;
  message: string;
  mode: "create" | "edit";
  type: string;
  affectedPolicies?: Array<{
    id: number;
    domain_scope: string | null;
    context_scope: string | null;
    data_contract_scope: string | null;
    permission_name: string;
  }>;
  newPolicy?: {
    assignTo: string;
    permissionName: string;
    domainScope: string | null;
    contextScope: string | null;
    dataContractScope?: string | null;
  } | null;
};

export type ViewUserPolicies = {
  userId: string;
  policies: Policy[];
  loading: boolean;
};
