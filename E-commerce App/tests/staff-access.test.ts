import { describe, expect, it } from "vitest";
import { buildStaffActor } from "@/lib/auth/staffAccess";

describe("staff session identity", () => {
  const session = {
    realm: "staff" as const,
    id: "staff-1",
    tenantId: "acme",
    email: "owner@example.com",
  };
  const member = {
    _id: "staff-1",
    tenantId: "acme",
    email: "owner@example.com",
    permissions: ["catalog:read"],
  };

  it("uses permissions from the matching tenant staff record", () => {
    expect(buildStaffActor(session, member)).toMatchObject({
      id: "staff-1",
      tenantId: "acme",
      permissions: ["catalog:read"],
    });
  });

  it("rejects mismatched tenant or identity data", () => {
    expect(buildStaffActor(session, { ...member, tenantId: "other" })).toBeNull();
    expect(buildStaffActor(session, { ...member, _id: "other" })).toBeNull();
  });

  it("rejects inactive staff and filters malformed permissions", () => {
    expect(buildStaffActor(session, { ...member, active: false })).toBeNull();
    expect(
      buildStaffActor(session, { ...member, permissions: ["catalog:read", 4] }),
    ).toMatchObject({ permissions: ["catalog:read"] });
  });
});
