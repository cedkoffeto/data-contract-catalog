import fs from "node:fs";
import path from "node:path";

import type { RJSFSchema } from "@rjsf/utils";

import { getContracts } from "@/src/lib/contracts";
import type { DataContract } from "@/src/lib/types";

const schemaPath = path.join(process.cwd(), "schema", "contract_schema.json");

let editorSchemaCache: RJSFSchema | null = null;

function cloneSchema<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stripNestedRequired(schema: RJSFSchema, isRoot = true): void {
  if (!schema || typeof schema !== "object") {
    return;
  }

  if (!isRoot && Array.isArray(schema.required)) {
    delete schema.required;
  }

  if (schema.type === "object" || schema.properties) {
    schema.additionalProperties = true;

    const properties = schema.properties ?? {};
    for (const value of Object.values(properties)) {
      stripNestedRequired(value as RJSFSchema, false);
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) {
        stripNestedRequired(item as RJSFSchema, false);
      }
    } else {
      stripNestedRequired(schema.items as RJSFSchema, false);
    }
  }

  if (schema.definitions) {
    for (const value of Object.values(schema.definitions)) {
      stripNestedRequired(value as RJSFSchema, false);
    }
  }
}

function collectFieldTypes(): string[] {
  const types = new Set<string>();

  function visit(fields: Array<Record<string, unknown>> = []) {
    for (const field of fields) {
      const type = typeof field.type === "string" ? field.type : "";
      if (type) {
        types.add(type);
      }

      const nested = Array.isArray(field.fields) ? (field.fields as Array<Record<string, unknown>>) : [];
      if (nested.length > 0) {
        visit(nested);
      }
    }
  }

  for (const contract of getContracts()) {
    const fields = contract.data.contract?.schema?.fields as Array<Record<string, unknown>> | undefined;
    visit(fields ?? []);
  }

  return [...types].sort();
}

export function getEditorSchema(): RJSFSchema {
  if (editorSchemaCache) {
    return editorSchemaCache;
  }

  const baseSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8")) as RJSFSchema;
  const schema = cloneSchema(baseSchema);
  const fieldTypes = collectFieldTypes();

  schema.properties = schema.properties ?? {};

  const assetSchema = schema.properties.asset as RJSFSchema;
  assetSchema.properties = assetSchema.properties ?? {};
  (assetSchema.properties.id as RJSFSchema).description =
    "Asset ID as currently used in the catalog. The reference schema was relaxed to support existing contracts.";
  delete (assetSchema.properties.id as RJSFSchema).pattern;
  assetSchema.properties.maturity = {
    type: "string",
    enum: ["bronze", "silver", "gold"],
    description: "Current catalog maturity."
  };

  const contractSchema = schema.properties.contract as RJSFSchema;
  contractSchema.properties = contractSchema.properties ?? {};

  schema.definitions = {
    ...(schema.definitions ?? {}),
    contractField: {
      type: "object",
      additionalProperties: true,
      properties: {
        name: { type: "string", title: "Name" },
        type: {
          type: "string",
          enum: fieldTypes,
          title: "Type"
        },
        description: { type: "string", title: "Description" },
        required: { type: "boolean", title: "Required" },
        pii_classification: {
          type: "string",
          enum: ["none", "direct", "indirect", "sensitive"],
          title: "PII classification"
        },
        business_rules: {
          type: "array",
          title: "Business rules",
          items: { type: "string" }
        },
        example: {
          title: "Example"
        },
        extra_properties: {
          type: "object",
          title: "Extra properties",
          additionalProperties: true,
          properties: {
            sql_expression: { type: "string", title: "SQL expression" }
          }
        },
        fields: {
          type: "array",
          title: "Nested fields",
          items: { $ref: "#/definitions/contractField" }
        }
      }
    }
  };

  const schemaContainer = contractSchema.properties.schema as RJSFSchema;
  schemaContainer.properties = schemaContainer.properties ?? {};
  const fieldsSchema = schemaContainer.properties.fields as RJSFSchema;
  fieldsSchema.items = { $ref: "#/definitions/contractField" };

  const qualitySchema = schema.properties.quality as RJSFSchema;
  const checksSchema = (((qualitySchema.properties ?? {}).checks as RJSFSchema)?.items ?? {}) as RJSFSchema;
  const qualityTypeSchema = ((checksSchema.properties ?? {}).type ?? {}) as RJSFSchema;
  qualityTypeSchema.enum = ["completeness", "freshness", "referential_integrity", "rule", "size", "uniqueness", "validity"];

  const securitySchema = schema.properties.security as RJSFSchema;
  const classificationSchema = ((securitySchema.properties ?? {}).classification ?? {}) as RJSFSchema;
  classificationSchema.enum = ["public", "internal", "confidential", "confidentiel", "restricted"];

  stripNestedRequired(schema);

  editorSchemaCache = schema;
  return editorSchemaCache;
}

export function createNewContractDraft(): DataContract {
  return {
    asset: {
      id: "",
      name: "",
      maturity: "bronze",
      domain: "",
      context: "",
      type: "dataset",
      description: "",
      version: "1.0.0",
      owners: {
        business_owner: {
          name: "",
          team: "",
          email: ""
        },
        technical_owner: {
          name: "",
          team: "",
          email: ""
        }
      },
      status: "active",
      tags: []
    },
    contract: {
      primary_key: [],
      grain: "",
      refresh: {
        frequency: "daily"
      },
      sla: {
        availability: "99.0",
        ready_by: "08:00",
        max_delay_minutes: 60
      },
      schema: {
        fields: [
          {
            name: "",
            type: "string",
            description: "",
            required: true,
            pii_classification: "none",
            business_rules: []
          }
        ]
      }
    },
    quality: {
      checks: [],
      on_failure: {
        action: "warn",
        notify: []
      }
    },
    security: {
      classification: "internal",
      pii: {
        contains_pii: false,
        notes: ""
      },
      access_policies: {
        roles: [],
        row_level_filters: {
          enabled: false,
          rules: []
        },
        column_masking: []
      }
    },
    inputs: {
      sources: [],
      transformations: []
    },
    output: {
      table_name: "",
      storage_format: "ICEBERG",
      location: "",
      partitioning: [],
      retention: {
        type: "time_based",
        value: ""
      }
    },
    serving: {
      technology: {
        type: "ORACLE",
        enabled: true,
        name: "",
        notes: ""
      }
    },
    operations: {
      airflow_dag_id: "",
      schedule_cron: "",
      expected_runtime_minutes: 30,
      alerts_channel: "",
      dependencies: [],
      retries: {
        max_retries: 1,
        backoff_minutes: 5
      },
      logging: {
        level: "INFO",
        log_retention_days: 30
      }
    },
    lineage: {
      upstream: [],
      downstream: [],
      documentation_links: []
    },
    extra_properties: {
      ingestion: "",
      filiale: ""
    }
  } as DataContract;
}
