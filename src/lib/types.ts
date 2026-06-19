export type AnyRecord = Record<string, unknown>;

export type Owner = {
  name?: string;
  email?: string;
  team?: string;
};

export type Asset = {
  id?: string;
  name?: string;
  maturity?: string;
  domain?: string;
  context?: string;
  type?: string;
  description?: string;
  version?: string;
  status?: string;
  tags?: string[];
  owners?: {
    business_owner?: Owner;
    technical_owner?: Owner;
  };
};

export type ContractField = {
  name?: string;
  type?: string;
  description?: string;
  required?: boolean;
  pii_classification?: string;
  business_rules?: string[];
  example?: unknown;
  fields?: ContractField[];
  extra_properties?: Record<string, unknown>;
};

export type QualityCheck = {
  name?: string;
  type?: string;
  field?: string;
  threshold?: number | string;
  expression?: string;
  critical?: boolean;
};

export type RolePolicy = {
  name?: string;
  permissions?: string[];
};

export type SourceDependency = {
  name?: string;
  type?: string;
  description?: string;
  owner?: string;
  ready_by?: string;
};

export type DataContract = {
  asset?: Asset;
  contract?: {
    schema?: {
      fields?: ContractField[];
    };
    primary_key?: string[] | string;
    grain?: string;
    refresh?: {
      frequency?: string;
    };
    sla?: {
      availability?: string | number;
      ready_by?: string;
      max_delay_minutes?: number;
    };
  };
  quality?: {
    checks?: QualityCheck[];
    on_failure?: {
      action?: string;
      notify?: string[];
    };
  };
  security?: {
    classification?: string;
    pii?: {
      contains_pii?: boolean;
      notes?: string;
    };
    access_policies?: {
      roles?: RolePolicy[];
      row_level_filters?: {
        enabled?: boolean;
        rules?: Array<{
          field?: string;
          condition?: string;
          description?: string;
        }>;
      };
      column_masking?: Array<{
        field?: string;
        policy?: string;
      }>;
    };
  };
  serving?: {
    technology?: {
      enabled?: boolean;
      name?: string;
      type?: string;
      notes?: string;
    };
  };
  output?: {
    location?: string;
    storage_format?: string;
    table_name?: string;
    partitioning?: string[];
    retention?: {
      type?: string;
      value?: string | number;
    };
  };
  inputs?: {
    sources?: SourceDependency[];
    transformations?: Array<Record<string, unknown>>;
  };
  operations?: {
    airflow_dag_id?: string;
    schedule_cron?: string;
    expected_runtime_minutes?: number;
    alerts_channel?: string;
    dependencies?: string[];
    retries?: {
      max_retries?: number;
      backoff_minutes?: number;
    };
    logging?: {
      level?: string;
      log_retention_days?: number;
    };
  };
  lineage?: {
    upstream?: string[];
    downstream?: string[];
    documentation_links?: string[];
  };
  extra_properties?: {
    ingestion?: string;
    filiale?: string;
    [key: string]: unknown;
  };
};

export type ContractFile = {
  slug: string;
  stem: string;
  maturity: string;
  fullPath: string;
  yamlRaw: string;
  data: DataContract;
};

export type CatalogCard = {
  slug: string;
  title: string;
  version: string;
  owner: string;
  description: string;
  maturity: string;
  domain: string;
  context: string;
  searchData: string;
  href: string;
  accessible: boolean;
  accessRequestStatus?: "pending";
};

export type ContractHistoryEntry = {
  id: string;
  shortId: string;
  title: string;
  description: string;
  authoredDate: string;
  authorName: string;
  filePath: string;
};

export type ContractComment = {
  id: number;
  contractSlug: string;
  userId: string;
  body: string;
  parentId: number | null;
  createdAt: string;
  editedAt: string | null;
};

export type ContractIssue = {
  id: number;
  contractSlug: string;
  userId: string;
  body: string;
  status: "open" | "fixed" | "false_alert";
  createdAt: string;
  resolvedAt: string | null;
};

export type UserProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
};

export type EditorRepositoryFile = {
  id: string;
  name: string;
  path: string;
  kind: "contract" | "yaml" | "json" | "markdown";
  content: string;
  contractSlug?: string;
  maturity?: string;
  data?: DataContract;
};
