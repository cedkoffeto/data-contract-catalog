import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const CatalogItemSchema = registry.register(
  "CatalogItem",
  z.object({
    slug: z.string().openapi({ example: "crm-ov" }),
    title: z.string().openapi({ example: "CRM Opportunities" }),
    version: z.string().openapi({ example: "1.0.0" }),
    owner: z.string().openapi({ example: "Platform Team" }),
    description: z.string().openapi({ example: "Customer relationship management opportunity contract." }),
    maturity: z.string().openapi({ example: "silver" }),
    domain: z.string().openapi({ example: "crm" }),
    url: z.string().openapi({ example: "/crm-ov" })
  })
);

const CatalogListResponseSchema = registry.register(
  "CatalogListResponse",
  z.object({
    items: z.array(CatalogItemSchema)
  })
);

const ContractDetailResponseSchema = registry.register(
  "ContractDetailResponse",
  z.object({
    slug: z.string().openapi({ example: "crm-ov" }),
    stem: z.string().openapi({ example: "crm_ov" }),
    maturity: z.string().openapi({ example: "silver" }),
    fullPath: z.string().openapi({ example: "/workspace/contracts/silver/crm_ov.yaml" }),
    yamlRaw: z.string().openapi({ example: "asset:\n  name: CRM Opportunities" }),
    data: z.record(z.string(), z.unknown()).openapi({
      description: "Parsed data contract payload."
    })
  })
);

const RepositoryHistoryEntrySchema = registry.register(
  "ContractHistoryEntry",
  z.object({
    id: z.string().openapi({ example: "5f3d32f1f7f57d65d193ec35d0fa1a7668c40e41" }),
    shortId: z.string().openapi({ example: "5f3d32f1" }),
    title: z.string().openapi({ example: "Align CRM opportunities schema" }),
    description: z.string().openapi({ example: "Adds freshness checks and refresh metadata for consumers." }),
    authoredDate: z.string().openapi({ example: "2026-03-25T10:30:11.000Z" }),
    authorName: z.string().openapi({ example: "Platform Team" }),
    filePath: z.string().openapi({
      example: "silver/crm_ov.yaml",
      description: "Contract file path relative to the contract root."
    })
  })
);

const RepositoryHistoryResponseSchema = registry.register(
  "ContractHistoryResponse",
  z.object({
    items: z.array(RepositoryHistoryEntrySchema)
  })
);

const RepositoryFileResponseSchema = registry.register(
  "ContractVersionResponse",
  z.object({
    filePath: z.string().openapi({
      example: "silver/crm_ov.yaml",
      description: "Contract file path relative to the contract root."
    }),
    ref: z.string().openapi({ example: "5f3d32f1f7f57d65d193ec35d0fa1a7668c40e41" }),
    repositoryUrl: z.string().openapi({ example: "https://gitlab.example.com/data/contracts" }),
    content: z.string().openapi({ example: "asset:\n  id: crm/opportunities" })
  })
);

const HealthResponseSchema = registry.register(
  "HealthResponse",
  z.object({
    status: z.literal("ok")
  })
);

registry.registerPath({
  method: "get",
  path: "/api/contracts",
  tags: ["Catalog"],
  summary: "List contracts",
  description: "Returns the data contract metadata used by the catalog page.",
  responses: {
    200: {
      description: "Contracts list",
      content: {
        "application/json": {
          schema: CatalogListResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/search",
  tags: ["Catalog"],
  summary: "Search contracts",
  description: "Searches contract metadata using free text and optional domain or maturity filters.",
  request: {
    query: z.object({
      q: z.string().optional().openapi({
        example: "crm",
        description: "Free-text search across title, version, owner, description, maturity, and domain."
      }),
      domain: z.string().optional().openapi({
        example: "crm",
        description: "Exact domain filter."
      }),
      maturity: z.string().optional().openapi({
        example: "silver",
        description: "Exact maturity filter."
      })
    })
  },
  responses: {
    200: {
      description: "Filtered contracts list",
      content: {
        "application/json": {
          schema: CatalogListResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}",
  tags: ["Catalog"],
  summary: "Get contract",
  description: "Returns one contract with both its raw YAML source and parsed payload.",
  request: {
    params: z.object({
      slug: z.string().openapi({
        example: "crm-ov",
        description: "Contract slug."
      })
    })
  },
  responses: {
    200: {
      description: "Contract detail",
      content: {
        "application/json": {
          schema: ContractDetailResponseSchema
        }
      }
    },
    404: {
      description: "Contract not found"
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/history",
  tags: ["Contracts"],
  summary: "Get contract history",
  description: "Returns the change history for the specified contract file.",
  request: {
    params: z.object({
      slug: z.string().openapi({
        example: "crm-ov",
        description: "Contract slug."
      })
    })
  },
  responses: {
    200: {
      description: "Contract history entries",
      content: {
        "application/json": {
          schema: RepositoryHistoryResponseSchema
        }
      }
    },
    404: {
      description: "Contract not found"
    },
    503: {
      description: "History integration is not configured"
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/repository-content",
  tags: ["Contracts"],
  summary: "Get contract version content",
  description: "Returns the contract content for the specified version ref or the configured default branch.",
  request: {
    params: z.object({
      slug: z.string().openapi({
        example: "crm-ov",
        description: "Contract slug."
      })
    }),
    query: z.object({
      ref: z.string().optional().openapi({
        example: "5f3d32f1f7f57d65d193ec35d0fa1a7668c40e41",
        description: "Commit SHA, tag, or branch name. Defaults to GITLAB_REF."
      })
    })
  },
  responses: {
    200: {
      description: "Contract version content",
      content: {
        "application/json": {
          schema: RepositoryFileResponseSchema
        }
      }
    },
    404: {
      description: "Contract not found"
    },
    503: {
      description: "History integration is not configured"
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/healthz",
  tags: ["System"],
  summary: "Health check",
  description: "Lightweight endpoint used to confirm the service is healthy.",
  responses: {
    200: {
      description: "Service health",
      content: {
        "application/json": {
          schema: HealthResponseSchema
        }
      }
    }
  }
});

export function generateOpenApiDocument(baseUrl: string) {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Data Product Contract Catalog API",
      version: "1.0.0",
      description: "OpenAPI documentation generated from typed schemas for the data contract catalog service."
    },
    servers: [
      {
        url: baseUrl,
        description: "Current server"
      }
    ],
    tags: [
      { name: "Catalog", description: "Contract catalog endpoints" },
      { name: "Contracts", description: "Contract detail, history, and version endpoints" },
      { name: "System", description: "Operational service endpoints" }
    ]
  });
}
