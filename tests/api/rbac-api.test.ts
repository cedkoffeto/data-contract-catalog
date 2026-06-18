import { afterEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function mockAdminGate(response: Response | null = null) {
  const requireAdmin = vi.fn(async () => response);
  vi.doMock("@/src/lib/require-admin", () => ({ requireAdmin }));
  return requireAdmin;
}

function mockApiGate(response: Response | null = null) {
  const requireApiAuth = vi.fn(async () => response);
  vi.doMock("@/src/lib/require-auth", () => ({ requireApiAuth }));
  return requireApiAuth;
}

function mockAuth(user = { name: "admin.user", email: "admin.user@example.com" }) {
  const auth = vi.fn(async () => ({ user }));
  vi.doMock("@/src/auth", () => ({ auth }));
  return auth;
}

function mockAccessControl(overrides: Record<string, unknown> = {}) {
  const mocked = {
    addUserToGroup: vi.fn(),
    checkPolicyConflicts: vi.fn(),
    createAccessPolicy: vi.fn(),
    deleteAccessPolicy: vi.fn(),
    deleteGroup: vi.fn(),
    findNarrowerPolicies: vi.fn(),
    getAccessPolicy: vi.fn(),
    getEffectivePoliciesForUser: vi.fn(),
    listAccessPolicies: vi.fn(),
    listGroups: vi.fn(),
    listPermissions: vi.fn(),
    removeUserFromGroup: vi.fn(),
    updateAccessPolicy: vi.fn(),
    ...overrides
  };

  vi.doMock("@/src/lib/access-control", () => mocked);
  return mocked;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("RBAC admin policies API", () => {
  it("returns the admin guard response before touching policy storage", async () => {
    mockAdminGate(jsonResponse({ error: "Admin privileges required" }, 403));
    const listAccessPolicies = vi.fn();
    mockAccessControl({ listAccessPolicies });

    const route = await import("../../app/api/admin/policies/route");
    const response = await route.GET();

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({ error: "Admin privileges required" });
    expect(listAccessPolicies).not.toHaveBeenCalled();
  });

  it("lists access policies for an admin user", async () => {
    mockAdminGate();
    const listAccessPolicies = vi.fn(async () => [
      {
        id: 1,
        user_id: "reader.user",
        group_id: null,
        group_name: null,
        permission_id: 3,
        permission_name: "reader",
        domain_scope: "crm",
        context_scope: null,
        data_contract_scope: null
      }
    ]);

    mockAccessControl({ listAccessPolicies });

    const route = await import("../../app/api/admin/policies/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      items: [
        {
          id: 1,
          user_id: "reader.user",
          group_id: null,
          group_name: null,
          permission_id: 3,
          permission_name: "reader",
          domain_scope: "crm",
          context_scope: null,
          data_contract_scope: null
        }
      ]
    });
  });

  it("rejects policy creation when neither user nor group is provided", async () => {
    mockAdminGate();
    mockAuth();
    mockAccessControl();

    const route = await import("../../app/api/admin/policies/route");
    const response = await route.POST(jsonRequest({ permissionId: 3 }));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "Either userId or groupId is required" });
  });

  it("returns conflict details instead of creating a duplicate policy", async () => {
    mockAdminGate();
    mockAuth();

    const conflict = {
      type: "duplicate",
      message: "An identical policy already exists.",
      existing: { id: 12, permission_name: "reader" }
    };
    const createAccessPolicy = vi.fn();

    mockAccessControl({
      checkPolicyConflicts: vi.fn(async () => conflict),
      createAccessPolicy,
      listPermissions: vi.fn(async () => [{ id: 3, name: "reader" }])
    });

    const route = await import("../../app/api/admin/policies/route");
    const response = await route.POST(
      jsonRequest({ userId: "reader.user", permissionId: 3, domainScope: "crm" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(409);
    expect(payload.conflict).toEqual(conflict);
    expect(payload.newPolicy).toEqual({
      assignTo: "reader.user",
      permissionId: 3,
      permissionName: "reader",
      domainScope: "crm",
      contextScope: null,
      dataContractScope: null
    });
    expect(createAccessPolicy).not.toHaveBeenCalled();
  });

  it("creates a policy when validation passes and no conflict exists", async () => {
    mockAdminGate();
    mockAuth();

    const created = {
      id: 30,
      user_id: "editor.user",
      group_id: null,
      permission_id: 2,
      permission_name: "editor",
      domain_scope: "crm",
      context_scope: "claims",
      data_contract_scope: null
    };
    const createAccessPolicy = vi.fn(async () => created);

    mockAccessControl({
      checkPolicyConflicts: vi.fn(async () => null),
      createAccessPolicy
    });

    const route = await import("../../app/api/admin/policies/route");
    const response = await route.POST(
      jsonRequest({ userId: "editor.user", permissionId: 2, domainScope: "crm", contextScope: "claims" })
    );

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual(created);
    expect(createAccessPolicy).toHaveBeenCalledWith({
      userId: "editor.user",
      groupId: null,
      permissionId: 2,
      domainScope: "crm",
      contextScope: "claims",
      dataContractScope: null,
      actorId: "admin.user@example.com"
    });
  });

  it("forces a broader policy by delegating to createAccessPolicy with force", async () => {
    mockAdminGate();
    mockAuth();

    const forced = {
      id: 7,
      group_id: 2,
      permission_id: 2,
      permission_name: "editor",
      domain_scope: "crm",
      context_scope: null,
      data_contract_scope: null
    };
    const createAccessPolicy = vi.fn(async () => forced);

    mockAccessControl({
      checkPolicyConflicts: vi.fn(async () => ({
        type: "broader",
        message: "Broader policy",
        existing: { id: 6, permission_name: "reader" }
      })),
      createAccessPolicy
    });

    const route = await import("../../app/api/admin/policies/route");
    const response = await route.POST(
      jsonRequest({ groupId: 2, permissionId: 2, domainScope: "crm", force: true })
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual(forced);
    expect(createAccessPolicy).toHaveBeenCalledWith({
      userId: null,
      groupId: 2,
      permissionId: 2,
      domainScope: "crm",
      contextScope: null,
      dataContractScope: null,
      actorId: "admin.user@example.com",
      force: true
    });
  });
});

describe("RBAC admin policy by id API", () => {
  it("rejects invalid policy ids on update", async () => {
    mockAdminGate();
    mockAuth();
    mockAccessControl();

    const route = await import("../../app/api/admin/policies/[id]/route");
    const response = await route.PATCH(jsonRequest({ permissionId: 2 }), {
      params: Promise.resolve({ id: "abc" })
    });

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "Invalid policy id" });
  });

  it("returns 404 when updating a missing policy", async () => {
    mockAdminGate();
    mockAuth();

    mockAccessControl({
      getAccessPolicy: vi.fn(async () => null),
    });

    const route = await import("../../app/api/admin/policies/[id]/route");
    const response = await route.PATCH(jsonRequest({ permissionId: 2 }), {
      params: Promise.resolve({ id: "123" })
    });

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({ error: "Policy not found" });
  });

  it("updates a policy when no conflict exists", async () => {
    mockAdminGate();
    mockAuth();

    const updated = {
      id: 123,
      user_id: "editor.user",
      group_id: null,
      permission_id: 2,
      permission_name: "editor",
      domain_scope: "crm",
      context_scope: "claims",
      data_contract_scope: "crm-reclamation"
    };
    const updateAccessPolicy = vi.fn(async () => updated);

    mockAccessControl({
      checkPolicyConflicts: vi.fn(async () => null),
      getAccessPolicy: vi.fn(async () => ({
        id: 123,
        user_id: "editor.user",
        group_id: null
      })),
      updateAccessPolicy
    });

    const route = await import("../../app/api/admin/policies/[id]/route");
    const response = await route.PATCH(
      jsonRequest({
        permissionId: 2,
        domainScope: "crm",
        contextScope: "claims",
        dataContractScope: "crm-reclamation"
      }),
      { params: Promise.resolve({ id: "123" }) }
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual(updated);
    expect(updateAccessPolicy).toHaveBeenCalledWith({
      id: 123,
      permissionId: 2,
      domainScope: "crm",
      contextScope: "claims",
      dataContractScope: "crm-reclamation",
      actorId: "admin.user@example.com"
    });
  });

  it("deletes a policy by id", async () => {
    mockAdminGate();
    mockAuth();
    const deleteAccessPolicy = vi.fn(async () => undefined);

    mockAccessControl({ deleteAccessPolicy });

    const route = await import("../../app/api/admin/policies/[id]/route");
    const response = await route.DELETE(new Request("http://localhost.test/api"), {
      params: Promise.resolve({ id: "123" })
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ success: true });
    expect(deleteAccessPolicy).toHaveBeenCalledWith({
      id: 123,
      actorId: "admin.user@example.com"
    });
  });
});

describe("RBAC admin groups API", () => {
  it("lists groups", async () => {
    mockAdminGate();
    const listGroups = vi.fn(async () => [{ id: 1, name: "Data owners" }]);

    mockAccessControl({ listGroups });

    const route = await import("../../app/api/admin/groups/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ items: [{ id: 1, name: "Data owners" }] });
  });

  it("creates a group with a trimmed name", async () => {
    mockAdminGate();
    mockAuth();
    const createGroup = vi.fn(async () => ({ id: 2, name: "Editors" }));

    mockAccessControl({ createGroup });

    const route = await import("../../app/api/admin/groups/route");
    const response = await route.POST(jsonRequest({ name: "  Editors  " }));

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({ id: 2, name: "Editors" });
    expect(createGroup).toHaveBeenCalledWith({
      name: "Editors",
      actorId: "admin.user@example.com"
    });
  });

  it("deletes a group by id", async () => {
    mockAdminGate();
    mockAuth();
    const deleteGroup = vi.fn(async () => undefined);

    mockAccessControl({ deleteGroup });

    const route = await import("../../app/api/admin/groups/[id]/route");
    const response = await route.DELETE(new Request("http://localhost.test/api"), {
      params: Promise.resolve({ id: "5" })
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ success: true });
    expect(deleteGroup).toHaveBeenCalledWith({
      id: 5,
      actorId: "admin.user@example.com"
    });
  });

  it("adds a user to a group", async () => {
    mockAdminGate();
    mockAuth();
    const addUserToGroup = vi.fn(async () => undefined);

    mockAccessControl({ addUserToGroup });

    const route = await import("../../app/api/admin/groups/[id]/members/route");
    const response = await route.POST(jsonRequest({ userId: "  editor.user  " }), {
      params: Promise.resolve({ id: "5" })
    });

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({ success: true });
    expect(addUserToGroup).toHaveBeenCalledWith({
      userId: "editor.user",
      groupId: 5,
      actorId: "admin.user@example.com"
    });
  });

  it("removes a user from a group", async () => {
    mockAdminGate();
    mockAuth();
    const removeUserFromGroup = vi.fn(async () => undefined);

    mockAccessControl({ removeUserFromGroup });

    const route = await import("../../app/api/admin/groups/[id]/members/route");
    const response = await route.DELETE(jsonRequest({ userId: "editor.user" }), {
      params: Promise.resolve({ id: "5" })
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ success: true });
    expect(removeUserFromGroup).toHaveBeenCalledWith({
      userId: "editor.user",
      groupId: 5,
      actorId: "admin.user@example.com"
    });
  });

  it("lists all group memberships", async () => {
    mockAdminGate();
    const listAllGroupMemberships = vi.fn(async () => [
      { group_id: 5, group_name: "Editors", user_id: "editor.user" }
    ]);

    vi.doMock("@/src/lib/access-control", () => ({
      listAllGroupMemberships
    }));

    const route = await import("../../app/api/admin/groups/memberships/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      items: [{ group_id: 5, group_name: "Editors", user_id: "editor.user" }]
    });
    expect(listAllGroupMemberships).toHaveBeenCalled();
  });
});

describe("RBAC admin lookup APIs", () => {
  it("returns permissions", async () => {
    mockAdminGate();
    mockAccessControl({
      listPermissions: vi.fn(async () => [
        { id: 1, name: "admin" },
        { id: 2, name: "editor" },
        { id: 3, name: "reader" }
      ])
    });

    const route = await import("../../app/api/admin/permissions/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      items: [
        { id: 1, name: "admin" },
        { id: 2, name: "editor" },
        { id: 3, name: "reader" }
      ]
    });
  });

  it("returns effective policies for a user", async () => {
    mockAdminGate();
    const getEffectivePoliciesForUser = vi.fn(async () => [{ id: 9, permission_name: "reader" }]);

    mockAccessControl({
      getEffectivePoliciesForUser
    });

    const route = await import("../../app/api/admin/policies/effective/route");
    const response = await route.GET(
      new Request("http://localhost.test/api/admin/policies/effective?userId=reader.user")
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      items: [{ id: 9, permission_name: "reader" }],
      userId: "reader.user"
    });
    expect(getEffectivePoliciesForUser).toHaveBeenCalledWith("reader.user");
  });

  it("requires userId when reading effective policies", async () => {
    mockAdminGate();
    mockAccessControl();

    const route = await import("../../app/api/admin/policies/effective/route");
    const response = await route.GET(new Request("http://localhost.test/api/admin/policies/effective"));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "userId query parameter is required" });
  });

  it("returns distinct contract scopes", async () => {
    mockAdminGate();
    vi.doMock("@/src/lib/contracts", () => ({
      getDistinctScopes: vi.fn(async () => [{ domain: "crm", context: "claims" }])
    }));

    const route = await import("../../app/api/admin/scopes/route");
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ items: [{ domain: "crm", context: "claims" }] });
  });

  it("searches users", async () => {
    mockAdminGate();
    const searchAllUsers = vi.fn(async () => [
      { userId: "admin.user", email: "admin.user@example.com" },
      { userId: "reader.user", email: "reader.user@example.com" }
    ]);

    vi.doMock("@/src/lib/rbac", () => ({ searchAllUsers }));

    const route = await import("../../app/api/admin/users/search/route");
    const response = await route.GET(new Request("http://localhost.test/api/admin/users/search?q=user"));

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ items: [
      { userId: "admin.user", email: "admin.user@example.com" },
      { userId: "reader.user", email: "reader.user@example.com" }
    ] });
    expect(searchAllUsers).toHaveBeenCalledWith("user");
  });

  it("lists admin contracts filtered by domain and context", async () => {
    mockAdminGate();
    const getContracts = vi.fn(async () => [
      {
        slug: "crm-reclamation",
        data: { asset: { name: "CRM Reclamation", domain: "crm", context: "claims" } }
      },
      {
        slug: "dat-bdc",
        data: { asset: { name: "DAT BDC", domain: "dat", context: "savings" } }
      }
    ]);

    vi.doMock("@/src/lib/contracts", () => ({ getContracts }));

    const route = await import("../../app/api/admin/contracts/route");
    const response = await route.GET(
      new Request("http://localhost.test/api/admin/contracts?domain=crm&context=claims")
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      items: [
        {
          slug: "crm-reclamation",
          title: "CRM Reclamation",
          domain: "crm",
          context: "claims"
        }
      ]
    });
  });
});

describe("RBAC contract APIs", () => {
  it("forbids reading a contract when the user lacks scoped access", async () => {
    mockApiGate();
    mockAuth({ name: "reader.user", email: "reader.user@example.com" });

    vi.doMock("@/src/lib/contracts", () => ({
      getContractBySlug: vi.fn(async () => ({
        slug: "crm-reclamation",
        stem: "crm_reclamation",
        maturity: "silver",
        fullPath: "contracts/silver/crm_reclamation.yaml",
        yamlRaw: "asset:\n  name: CRM",
        data: { asset: { domain: "crm", context: "claims" } }
      }))
    }));
    vi.doMock("@/src/lib/rbac", () => ({
      getUserPermissions: vi.fn(async () => ["read"])
    }));
    vi.doMock("@/src/lib/access-control", () => ({
      authorize: vi.fn(async () => false)
    }));

    const route = await import("../../app/api/contracts/[slug]/route");
    const response = await route.GET(new Request("http://localhost.test/api"), {
      params: Promise.resolve({ slug: "crm-reclamation" })
    });

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({
      error: "Forbidden: insufficient permissions on this contract"
    });
  });

  it("returns a contract when scoped read access is granted", async () => {
    mockApiGate();
    mockAuth({ name: "reader.user", email: "reader.user@example.com" });

    const contract = {
      slug: "crm-reclamation",
      stem: "crm_reclamation",
      maturity: "silver",
      fullPath: "contracts/silver/crm_reclamation.yaml",
      yamlRaw: "asset:\n  name: CRM",
      data: { asset: { domain: "crm", context: "claims" } }
    };

    vi.doMock("@/src/lib/contracts", () => ({
      getContractBySlug: vi.fn(async () => contract)
    }));
    vi.doMock("@/src/lib/rbac", () => ({
      getUserPermissions: vi.fn(async () => ["read"])
    }));
    vi.doMock("@/src/lib/access-control", () => ({
      authorize: vi.fn(async () => true)
    }));

    const route = await import("../../app/api/contracts/[slug]/route");
    const response = await route.GET(new Request("http://localhost.test/api"), {
      params: Promise.resolve({ slug: "crm-reclamation" })
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual(contract);
  });
});
