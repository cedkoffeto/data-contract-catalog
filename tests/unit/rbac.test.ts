import { describe, expect, it } from "vitest";
import { hasPermission, canWrite, canAdmin } from "@/src/lib/rbac";

describe("hasPermission", () => {
  it("returns true when admin is in the permission set regardless of required level", () => {
    expect(hasPermission(["admin"], "read")).toBe(true);
    expect(hasPermission(["admin"], "write")).toBe(true);
    expect(hasPermission(["admin"], "admin")).toBe(true);
  });

  it("returns true when the required permission is present", () => {
    expect(hasPermission(["read"], "read")).toBe(true);
    expect(hasPermission(["write"], "write")).toBe(true);
  });

  it("returns false when the required permission is absent", () => {
    expect(hasPermission(["read"], "write")).toBe(false);
    expect(hasPermission(["write"], "admin")).toBe(false);
    expect(hasPermission(["read"], "admin")).toBe(false);
  });

  it("returns false for an empty permission set", () => {
    expect(hasPermission([], "read")).toBe(false);
    expect(hasPermission([], "write")).toBe(false);
    expect(hasPermission([], "admin")).toBe(false);
  });

  it("treats higher permissions as satisfying lower ones only for admin", () => {
    expect(hasPermission(["write"], "read")).toBe(false);
    expect(hasPermission(["write", "admin"], "read")).toBe(true);
  });
});

describe("canWrite", () => {
  it("returns true when admin is present", () => {
    expect(canWrite(["admin"])).toBe(true);
  });

  it("returns true when write is present", () => {
    expect(canWrite(["write"])).toBe(true);
  });

  it("returns false for read-only", () => {
    expect(canWrite(["read"])).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(canWrite([])).toBe(false);
  });
});

describe("canAdmin", () => {
  it("returns true when admin is present", () => {
    expect(canAdmin(["admin"])).toBe(true);
  });

  it("returns false for non-admin permissions", () => {
    expect(canAdmin(["write"])).toBe(false);
    expect(canAdmin(["read"])).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(canAdmin([])).toBe(false);
  });
});
