import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Catalog schemas ────────────────────────────────────────────────────

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
    context: z.string().openapi({ example: "sales" }),
    url: z.string().openapi({ example: "/crm-ov" }),
  })
);

const CatalogListResponseSchema = registry.register(
  "CatalogListResponse",
  z.object({
    contracts: z.array(CatalogItemSchema),
    nextCursor: z.string().nullable(),
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
    data: z.record(z.string(), z.unknown()).openapi({ description: "Parsed data contract payload." }),
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
    filePath: z.string().openapi({ example: "silver/crm_ov.yaml", description: "Contract file path relative to the contract root." }),
  })
);

const RepositoryHistoryResponseSchema = registry.register(
  "ContractHistoryResponse",
  z.object({ items: z.array(RepositoryHistoryEntrySchema) })
);

const RepositoryFileResponseSchema = registry.register(
  "ContractVersionResponse",
  z.object({
    filePath: z.string().openapi({ example: "silver/crm_ov.yaml", description: "Contract file path relative to the contract root." }),
    ref: z.string().openapi({ example: "5f3d32f1f7f57d65d193ec35d0fa1a7668c40e41" }),
    repositoryUrl: z.string().openapi({ example: "https://gitlab.example.com/data/contracts" }),
    content: z.string().openapi({ example: "asset:\n  id: crm/opportunities" }),
  })
);

// ── Access Request schemas ────────────────────────────────────────────────────

const AccessRequestItemSchema = registry.register(
  "AccessRequestItem",
  z.object({
    id: z.number(),
    user_id: z.string(),
    domain: z.string(),
    context: z.string(),
    data_contract: z.string(),
    requested_permission: z.enum(["reader", "editor"]),
    message: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
);

const AccessRequestStatusSchema = registry.register(
  "AccessRequestStatus",
  z.object({ status: z.string().nullable() })
);

// ── Admin schemas ────────────────────────────────────────────────────

const AdminContractItemSchema = registry.register(
  "AdminContractItem",
  z.object({
    slug: z.string(),
    title: z.string(),
    domain: z.string(),
    context: z.string(),
  })
);

const DashboardResponseSchema = registry.register(
  "DashboardResponse",
  z.object({
    contractsCount: z.number(),
    groupCount: z.number(),
    memberCount: z.number(),
    userCount: z.number(),
    policyCount: z.number(),
    notificationsCount: z.number(),
    unreadNotificationsCount: z.number(),
    subscriptionsCount: z.number(),
    auditCount: z.number(),
    recentLogs: z.array(z.object({
      id: z.number(),
      action: z.string(),
      actor_id: z.string(),
      target_type: z.string(),
      target_id: z.string(),
      details: z.string(),
      created_at: z.string(),
    })),
  })
);

const GroupSchema = registry.register("Group", z.object({ id: z.number(), name: z.string() }));

const AccessPolicyRecordSchema = registry.register(
  "AccessPolicyRecord",
  z.object({
    id: z.number(),
    user_id: z.string().nullable(),
    group_id: z.number().nullable(),
    group_name: z.string().nullable(),
    permission_id: z.number(),
    permission_name: z.string(),
    domain_scope: z.string().nullable(),
    context_scope: z.string().nullable(),
    data_contract_scope: z.string().nullable(),
  })
);

const PermissionSchema = registry.register("Permission", z.object({ id: z.number(), name: z.string() }));

const ScopeSchema = registry.register("Scope", z.object({ domain: z.string(), context: z.string() }));

const UserSearchResultSchema = registry.register(
  "UserSearchResult",
  z.object({ userId: z.string(), email: z.string().nullable() })
);

const MembershipSchema = registry.register(
  "Membership",
  z.object({ group_id: z.number(), group_name: z.string(), user_id: z.string() })
);

const ConflictResponseSchema = registry.register(
  "ConflictResponse",
  z.object({
    conflict: z.object({
      type: z.string(),
      message: z.string(),
      existing: AccessPolicyRecordSchema,
    }),
    affectedPolicies: z.array(AccessPolicyRecordSchema),
    newPolicy: z.object({
      assignTo: z.string(),
      permissionId: z.number(),
      permissionName: z.string(),
      domainScope: z.string().nullable(),
      contextScope: z.string().nullable(),
      dataContractScope: z.string().nullable(),
    }),
  })
);

// ── Change Request schemas ───────────────────────────────────────────────

const ChangeRequestSchema = registry.register(
  "ChangeRequest",
  z.object({
    id: z.number(),
    contractSlug: z.string(),
    editorId: z.string(),
    yamlContent: z.string(),
    originalSha: z.string(),
    status: z.enum(["pending", "approved", "rejected", "conflicted"]),
    gitlabMrId: z.number().nullable(),
    gitlabMrUrl: z.string(),
    rejectionReason: z.string(),
    createdAt: z.string(),
    resolvedAt: z.string().nullable(),
    resolvedBy: z.string().nullable(),
    source: z.enum(["app", "external"]),
    updatedAt: z.string(),
  })
);

const SyncResultSchema = registry.register(
  "SyncResult",
  z.object({
    synced: z.number(),
    results: z.array(z.object({ id: z.number(), action: z.string() })),
  })
);

// ── Comment / Issue schemas ──────────────────────────────────────────────

const ContractCommentSchema = registry.register(
  "ContractComment",
  z.object({
    id: z.number(),
    contractSlug: z.string(),
    userId: z.string(),
    body: z.string(),
    parentId: z.number().nullable(),
    targetFields: z.array(z.string()),
    createdAt: z.string(),
    editedAt: z.string().nullable(),
  })
);

const ContractIssueSchema = registry.register(
  "ContractIssue",
  z.object({
    id: z.number(),
    contractSlug: z.string(),
    userId: z.string(),
    body: z.string(),
    status: z.enum(["open", "fixed", "false_alert"]),
    createdAt: z.string(),
    resolvedAt: z.string().nullable(),
  })
);

const DiscussionDataSchema = registry.register(
  "DiscussionData",
  z.object({
    comments: z.array(ContractCommentSchema),
    issues: z.array(ContractIssueSchema),
    users: z.array(z.object({ userId: z.string(), firstName: z.string(), lastName: z.string(), email: z.string().nullable() })),
  })
);

const DiscussionSummarySchema = registry.register(
  "DiscussionSummary",
  z.object({
    commentCount: z.number(),
    issueCount: z.number(),
    lastActivity: z.string().nullable(),
  })
);

// ── Notification schemas ─────────────────────────────────────────────────

const NotificationItemSchema = registry.register(
  "NotificationItem",
  z.object({
    id: z.number(),
    contractSlug: z.string(),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    metadata: z.string().nullable(),
    isRead: z.boolean(),
    createdAt: z.string(),
  })
);

// ── Subscription schemas ────────────────────────────────────────────────

const SubscriptionSchema = registry.register(
  "Subscription",
  z.object({
    userId: z.string(),
    contractSlug: z.string(),
    channel: z.string(),
    createdAt: z.string(),
  })
);

// ── User Preference schemas ──────────────────────────────────────────────

const UserPreferenceSchema = registry.register(
  "UserPreference",
  z.object({
    user_id: z.string(),
    notification_channel: z.enum(["in_app", "email", "both"]),
  })
);

const UserProfileSchema = registry.register(
  "UserProfile",
  z.object({ userId: z.string(), firstName: z.string(), lastName: z.string(), email: z.string().nullable() })
);

const ContractPreferencesSchema = registry.register(
  "ContractPreferences",
  z.object({ isFavorite: z.boolean().optional() })
);

// ── Error schemas ────────────────────────────────────────────────────────

const HealthResponseSchema = registry.register(
  "HealthResponse",
  z.object({ status: z.literal("ok") })
);

// =========================================================================
//  PATH REGISTRATIONS
// =========================================================================

// ── Catalog ──────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/contracts",
  tags: ["Catalog"],
  summary: "List contracts",
  description: "Returns the data contract metadata used by the catalog page, filtered by the caller's access. Supports cursor-based pagination.",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional().openapi({ example: 50, description: "Max contracts to return (default 50, max 200)." }),
      cursor: z.string().optional().openapi({ description: "Slug of the last contract from the previous page." }),
    }),
  },
  responses: {
    200: { description: "Contracts list", content: { "application/json": { schema: CatalogListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/search",
  tags: ["Catalog"],
  summary: "Search contracts",
  description: "Searches contract metadata using free text and optional domain or maturity filters.",
  request: {
    query: z.object({
      q: z.string().optional().openapi({ example: "crm", description: "Free-text search." }),
      domain: z.string().optional().openapi({ example: "crm", description: "Exact domain filter." }),
      maturity: z.string().optional().openapi({ example: "silver", description: "Exact maturity filter." }),
    }),
  },
  responses: {
    200: { description: "Filtered contracts list", content: { "application/json": { schema: CatalogListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}",
  tags: ["Catalog"],
  summary: "Get contract",
  description: "Returns one contract with both its raw YAML source and parsed payload.",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov", description: "Contract slug." }) }) },
  responses: {
    200: { description: "Contract detail", content: { "application/json": { schema: ContractDetailResponseSchema } } },
    404: { description: "Contract not found" },
  },
});

// ── Contracts (detail) ───────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/history",
  tags: ["Contracts"],
  summary: "Get contract history",
  description: "Returns the change history for the specified contract file.",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Contract history entries", content: { "application/json": { schema: RepositoryHistoryResponseSchema } } },
    404: { description: "Contract not found" },
    503: { description: "History integration is not configured" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/repository-content",
  tags: ["Contracts"],
  summary: "Get contract version content",
  description: "Returns the contract content for the specified version ref or the configured default branch.",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    query: z.object({ ref: z.string().optional().openapi({ example: "5f3d32f1", description: "Commit SHA, tag, or branch name." }) }),
  },
  responses: {
    200: { description: "Contract version content", content: { "application/json": { schema: RepositoryFileResponseSchema } } },
    404: { description: "Contract not found" },
    503: { description: "History integration is not configured" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/change-requests",
  tags: ["Contracts"],
  summary: "List change requests for a contract",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Change requests list", content: { "application/json": { schema: z.object({ items: z.array(ChangeRequestSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contracts/{slug}/change-requests",
  tags: ["Contracts"],
  summary: "Create a change request",
  description: "Submits a new YAML content change for a contract. Creates a GitLab MR.",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    body: {
      content: { "application/json": { schema: z.object({
        yamlContent: z.string().openapi({ description: "New YAML content for the contract." }),
        message: z.string().optional().openapi({ description: "Commit message." }),
      }) } },
    },
  },
  responses: {
    201: { description: "Change request created", content: { "application/json": { schema: z.object({ changeRequest: ChangeRequestSchema }) } } },
    400: { description: "Invalid input" },
    500: { description: "Internal error" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/comments",
  tags: ["Contracts"],
  summary: "List contract comments",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Comments list", content: { "application/json": { schema: z.object({ comments: z.array(ContractCommentSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contracts/{slug}/comments",
  tags: ["Contracts"],
  summary: "Create a comment",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    body: { content: { "application/json": { schema: z.object({
      body: z.string().openapi({ description: "Comment text (max 4000 chars)." }),
      parentId: z.number().optional().nullable(),
      targetFields: z.array(z.string()).optional(),
    }) } } },
  },
  responses: {
    201: { description: "Comment created", content: { "application/json": { schema: z.object({ comment: ContractCommentSchema }) } } },
    400: { description: "Invalid input" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/contracts/{slug}/comments",
  tags: ["Contracts"],
  summary: "Delete a comment",
  request: {
    body: { content: { "application/json": { schema: z.object({
      commentId: z.number(),
    }) } } },
  },
  responses: {
    200: { description: "Comment deleted" },
    400: { description: "Missing commentId" },
    403: { description: "Not authorized to delete" },
    404: { description: "Comment not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/discussion-data",
  tags: ["Contracts"],
  summary: "Get discussion data",
  description: "Returns comments, issues, and user profiles for the contract discussion panel.",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Discussion data", content: { "application/json": { schema: DiscussionDataSchema } } },
    404: { description: "Contract not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/discussion-summary",
  tags: ["Contracts"],
  summary: "Get discussion summary",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Discussion summary", content: { "application/json": { schema: DiscussionSummarySchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/export",
  tags: ["Contracts"],
  summary: "Export contract",
  description: "Exports a contract as CSV, YAML, or printable HTML.",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    query: z.object({ type: z.enum(["csv", "yaml", "pdf"]).optional().openapi({ example: "csv" }) }),
  },
  responses: {
    200: { description: "Exported file" },
    404: { description: "Contract not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/issues",
  tags: ["Contracts"],
  summary: "List contract issues",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Issues list", content: { "application/json": { schema: z.object({ issues: z.array(ContractIssueSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contracts/{slug}/issues",
  tags: ["Contracts"],
  summary: "Create an issue",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    body: { content: { "application/json": { schema: z.object({ body: z.string() }) } } },
  },
  responses: {
    201: { description: "Issue created", content: { "application/json": { schema: z.object({ issue: ContractIssueSchema }) } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/contract-issues/{id}",
  tags: ["Contracts"],
  summary: "Update issue status",
  request: {
    params: z.object({ id: z.string().openapi({ description: "Issue ID." }) }),
    body: { content: { "application/json": { schema: z.object({
      status: z.enum(["open", "fixed", "false_alert"]),
    }) } } },
  },
  responses: {
    200: { description: "Issue updated", content: { "application/json": { schema: z.object({ issue: ContractIssueSchema }) } } },
    400: { description: "Invalid input" },
    403: { description: "Forbidden" },
    404: { description: "Not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/preferences",
  tags: ["Contracts"],
  summary: "Get contract preferences",
  description: "Returns the current user's preferences for a contract (e.g., favorite status).",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Preferences", content: { "application/json": { schema: ContractPreferencesSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contracts/{slug}/preferences",
  tags: ["Contracts"],
  summary: "Update contract preferences",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    body: { content: { "application/json": { schema: z.object({
      isFavorite: z.boolean().optional(),
      isPinned: z.boolean().optional(),
    }) } } },
  },
  responses: {
    200: { description: "Preferences updated", content: { "application/json": { schema: ContractPreferencesSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contracts/{slug}/submit",
  tags: ["Contracts"],
  summary: "Submit contract",
  description: "Saves contract content directly to the repository (write access required). Notifies admins and subscribers.",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    body: { content: { "application/json": { schema: z.object({
      content: z.string(),
      commitMessage: z.string().optional(),
    }) } } },
  },
  responses: {
    200: { description: "Contract saved", content: { "application/json": { schema: z.object({ success: z.boolean(), slug: z.string() }) } } },
    400: { description: "Missing content" },
    403: { description: "Forbidden" },
    404: { description: "Contract not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contracts/{slug}/subscription",
  tags: ["Contracts"],
  summary: "Get subscription status",
  request: { params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }) },
  responses: {
    200: { description: "Subscription details", content: { "application/json": { schema: z.object({ subscription: SubscriptionSchema.nullable() }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contracts/{slug}/subscription",
  tags: ["Contracts"],
  summary: "Toggle subscription",
  description: "Subscribe or unsubscribe to contract change notifications.",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "crm-ov" }) }),
    body: { content: { "application/json": { schema: z.object({
      channel: z.string().nullable().optional().openapi({ description: "null to unsubscribe." }),
    }) } } },
  },
  responses: {
    200: { description: "Subscription updated", content: { "application/json": { schema: z.object({ subscription: SubscriptionSchema.nullable() }) } } },
  },
});

// ── Access Requests ──────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/access-requests",
  tags: ["Access Requests"],
  summary: "List access requests",
  description: "Returns all access requests (admin only).",
  responses: {
    200: { description: "Access requests list", content: { "application/json": { schema: z.object({ items: z.array(AccessRequestItemSchema) }) } } },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/access-requests",
  tags: ["Access Requests"],
  summary: "Create access request",
  description: "Requests access to a domain, context, or specific data contract.",
  request: {
    body: { content: { "application/json": { schema: z.object({
      domain: z.string().optional(),
      context: z.string().optional(),
      dataContract: z.string().optional(),
      message: z.string().optional(),
      requestedPermission: z.enum(["reader", "editor"]).optional(),
    }) } } },
  },
  responses: {
    201: { description: "Access request created", content: { "application/json": { schema: z.object({ id: z.number() }) } } },
    400: { description: "Invalid input" },
    401: { description: "Authentication required" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/access-requests/my",
  tags: ["Access Requests"],
  summary: "My access request status",
  description: "Returns the status of the current user's access request for a given contract.",
  request: {
    query: z.object({ contractSlug: z.string().openapi({ example: "crm-ov" }) }),
  },
  responses: {
    200: { description: "Access request status", content: { "application/json": { schema: AccessRequestStatusSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/access-requests/{id}",
  tags: ["Access Requests"],
  summary: "Update access request status",
  description: "Approves or rejects a pending access request (admin only).",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({
      status: z.enum(["pending", "approved", "rejected"]),
    }) } } },
  },
  responses: {
    200: { description: "Status updated" },
    400: { description: "Invalid status" },
    403: { description: "Forbidden" },
  },
});

// ── Change Requests ──────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/change-requests",
  tags: ["Change Requests"],
  summary: "List change requests",
  description: "Returns all change requests (admins see all; editors see their own).",
  responses: {
    200: { description: "Change requests list", content: { "application/json": { schema: z.object({ items: z.array(ChangeRequestSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/change-requests/sync",
  tags: ["Change Requests"],
  summary: "Sync change requests with GitLab",
  description: "Scans GitLab merge requests and updates change request statuses. Imports external MRs as new change requests (admin only).",
  responses: {
    200: { description: "Sync results", content: { "application/json": { schema: SyncResultSchema } } },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/change-requests/{id}",
  tags: ["Change Requests"],
  summary: "Process change request",
  description: "Merges or rejects a change request (admin only).",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({
      action: z.enum(["merge", "reject"]),
      rejectionReason: z.string().optional(),
    }) } } },
  },
  responses: {
    200: { description: "Action processed" },
    400: { description: "Invalid action or missing reason" },
    404: { description: "Change request not found" },
    409: { description: "Merge conflict" },
  },
});

// ── Admin: Contracts ────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/admin/contracts",
  tags: ["Admin"],
  summary: "Admin list contracts",
  description: "Returns contract slugs and metadata for admin policy management.",
  request: {
    query: z.object({
      domain: z.string().optional(),
      context: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Contract list", content: { "application/json": { schema: z.object({ items: z.array(AdminContractItemSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/dashboard",
  tags: ["Admin"],
  summary: "Admin dashboard stats",
  description: "Aggregated counts and recent audit logs.",
  responses: {
    200: { description: "Dashboard data", content: { "application/json": { schema: DashboardResponseSchema } } },
  },
});

// ── Admin: Groups ────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/admin/groups",
  tags: ["Admin"],
  summary: "List groups",
  responses: {
    200: { description: "Groups list", content: { "application/json": { schema: z.object({ items: z.array(GroupSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/groups",
  tags: ["Admin"],
  summary: "Create group",
  request: { body: { content: { "application/json": { schema: z.object({ name: z.string() }) } } } },
  responses: {
    201: { description: "Group created", content: { "application/json": { schema: GroupSchema } } },
    400: { description: "Invalid input" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/groups/{id}",
  tags: ["Admin"],
  summary: "Delete group",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Group deleted" },
    400: { description: "Invalid group id" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/groups/{id}/members",
  tags: ["Admin"],
  summary: "List group members",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Members list", content: { "application/json": { schema: z.object({ members: z.array(z.string()) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/groups/{id}/members",
  tags: ["Admin"],
  summary: "Add member to group",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ userId: z.string() }) } } },
  },
  responses: {
    201: { description: "Member added" },
    400: { description: "Invalid input" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/groups/{id}/members",
  tags: ["Admin"],
  summary: "Remove member from group",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({ userId: z.string() }) } } },
  },
  responses: {
    200: { description: "Member removed" },
    400: { description: "Invalid input" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/groups/memberships",
  tags: ["Admin"],
  summary: "List all group memberships",
  responses: {
    200: { description: "Memberships list", content: { "application/json": { schema: z.object({ items: z.array(MembershipSchema) }) } } },
  },
});

// ── Admin: Permissions & Policies ────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/admin/permissions",
  tags: ["Admin"],
  summary: "List permissions",
  responses: {
    200: { description: "Permissions list", content: { "application/json": { schema: z.object({ items: z.array(PermissionSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/policies",
  tags: ["Admin"],
  summary: "List access policies",
  responses: {
    200: { description: "Policies list", content: { "application/json": { schema: z.object({ items: z.array(AccessPolicyRecordSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/policies",
  tags: ["Admin"],
  summary: "Create access policy",
  description: "Creates a new access policy. Returns conflict details if a conflicting policy exists.",
  request: {
    body: { content: { "application/json": { schema: z.object({
      userId: z.string().optional(),
      groupId: z.number().optional(),
      permissionId: z.number(),
      domainScope: z.string().optional().nullable(),
      contextScope: z.string().optional().nullable(),
      dataContractScope: z.string().optional().nullable(),
      force: z.boolean().optional(),
    }) } } },
  },
  responses: {
    201: { description: "Policy created", content: { "application/json": { schema: AccessPolicyRecordSchema } } },
    200: { description: "Policy created (forced)", content: { "application/json": { schema: AccessPolicyRecordSchema } } },
    400: { description: "Invalid input" },
    409: { description: "Conflict detected", content: { "application/json": { schema: ConflictResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/policies/{id}",
  tags: ["Admin"],
  summary: "Update access policy",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.object({
      permissionId: z.number(),
      domainScope: z.string().optional().nullable(),
      contextScope: z.string().optional().nullable(),
      dataContractScope: z.string().optional().nullable(),
      force: z.boolean().optional(),
    }) } } },
  },
  responses: {
    200: { description: "Policy updated", content: { "application/json": { schema: AccessPolicyRecordSchema } } },
    400: { description: "Invalid input" },
    404: { description: "Policy not found" },
    409: { description: "Conflict detected", content: { "application/json": { schema: ConflictResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/policies/{id}",
  tags: ["Admin"],
  summary: "Delete access policy",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Policy deleted" },
    400: { description: "Invalid policy id" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/policies/effective",
  tags: ["Admin"],
  summary: "Get effective policies for a user",
  request: { query: z.object({ userId: z.string() }) },
  responses: {
    200: { description: "Effective policies", content: { "application/json": { schema: z.object({ items: z.array(AccessPolicyRecordSchema), userId: z.string() }) } } },
    400: { description: "Missing userId" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/scopes",
  tags: ["Admin"],
  summary: "List distinct scopes",
  responses: {
    200: { description: "Scopes list", content: { "application/json": { schema: z.object({ items: z.array(ScopeSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users/search",
  tags: ["Admin"],
  summary: "Search users",
  request: { query: z.object({ q: z.string().optional().openapi({ example: "john" }) }) },
  responses: {
    200: { description: "Users list", content: { "application/json": { schema: z.object({ items: z.array(UserSearchResultSchema) }) } } },
  },
});

// ── Notifications ────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/notifications",
  tags: ["Notifications"],
  summary: "List notifications",
  description: "Returns the current user's notifications.",
  responses: {
    200: { description: "Notifications list", content: { "application/json": { schema: z.object({ notifications: z.array(NotificationItemSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/notifications/read",
  tags: ["Notifications"],
  summary: "Mark notifications as read",
  description: "Marks specific notification IDs as read, or all if no IDs provided.",
  request: { body: { content: { "application/json": { schema: z.object({ ids: z.array(z.number()).optional() }) } } } },
  responses: { 200: { description: "Marked as read" } },
});

registry.registerPath({
  method: "post",
  path: "/api/notifications/unread",
  tags: ["Notifications"],
  summary: "Mark notifications as unread",
  request: { body: { content: { "application/json": { schema: z.object({ ids: z.array(z.number()) }) } } } },
  responses: {
    200: { description: "Marked as unread" },
    400: { description: "Missing ids" },
  },
});

// ── Subscriptions ────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/subscriptions",
  tags: ["Subscriptions"],
  summary: "List subscriptions",
  description: "Returns the current user's subscriptions.",
  responses: {
    200: { description: "Subscriptions list", content: { "application/json": { schema: z.object({ subscriptions: z.array(SubscriptionSchema) }) } } },
  },
});

// ── User ─────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/user/preferences",
  tags: ["User"],
  summary: "Get user preferences",
  description: "Returns notification channel preference for the current user.",
  responses: {
    200: { description: "User preferences", content: { "application/json": { schema: z.object({ preference: UserPreferenceSchema }) } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/user/preferences",
  tags: ["User"],
  summary: "Update user preferences",
  request: { body: { content: { "application/json": { schema: z.object({
    notificationChannel: z.enum(["in_app", "email", "both"]),
  }) } } } },
  responses: {
    200: { description: "Preferences updated" },
    400: { description: "Invalid channel" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users",
  tags: ["User"],
  summary: "Search/List users",
  description: "Returns user profiles matching the search query.",
  request: { query: z.object({ q: z.string().optional() }) },
  responses: {
    200: { description: "Users list", content: { "application/json": { schema: z.object({ users: z.array(UserProfileSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/policies/effective",
  tags: ["User"],
  summary: "Get own effective policies",
  description: "Returns effective policies for the current user or a specified user (admins only).",
  request: { query: z.object({ userId: z.string().optional() }) },
  responses: {
    200: { description: "Effective policies", content: { "application/json": { schema: z.object({ items: z.array(AccessPolicyRecordSchema) }) } } },
    403: { description: "Can only view own policies" },
  },
});

// ── System ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/healthz",
  tags: ["System"],
  summary: "Health check",
  description: "Lightweight endpoint used to confirm the service is healthy.",
  responses: {
    200: { description: "Service health", content: { "application/json": { schema: HealthResponseSchema } } },
  },
});

// =========================================================================
//  GENERATOR
// =========================================================================

export function generateOpenApiDocument(baseUrl: string) {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Data Product Contract Catalog API",
      version: "1.0.0",
      description: "OpenAPI documentation generated from typed schemas for the data contract catalog service.",
    },
    servers: [{ url: baseUrl, description: "Current server" }],
    tags: [
      { name: "Catalog", description: "Contract catalog endpoints" },
      { name: "Contracts", description: "Contract detail, history, comments, issues, and version endpoints" },
      { name: "Access Requests", description: "Access request management" },
      { name: "Change Requests", description: "Change request lifecycle" },
      { name: "Admin", description: "Admin RBAC, groups, policies, and dashboard" },
      { name: "Notifications", description: "User notification management" },
      { name: "Subscriptions", description: "Contract subscription management" },
      { name: "User", description: "User preferences and profile" },
      { name: "System", description: "Operational service endpoints" },
    ],
  });
}
