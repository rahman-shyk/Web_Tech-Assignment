import { describe, expect, it } from "vitest";
import { canTransitionTenantStatus } from "@/lib/platform/tenant-state";

describe("tenant lifecycle transitions", () => {
  it("allows activation only for suspended tenants and prevents reopening archived tenants", () => {
    expect(canTransitionTenantStatus("suspended", "active")).toBe(true);
    expect(canTransitionTenantStatus("pending", "active")).toBe(false);
    expect(canTransitionTenantStatus("archived", "active")).toBe(false);
  });

  it("allows active tenants to be suspended or archived", () => {
    expect(canTransitionTenantStatus("active", "suspended")).toBe(true);
    expect(canTransitionTenantStatus("active", "archived")).toBe(true);
    expect(canTransitionTenantStatus("active", "active")).toBe(false);
  });
});
