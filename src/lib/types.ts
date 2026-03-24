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
  searchData: string;
  href: string;
};
