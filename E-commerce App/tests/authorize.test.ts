import { describe, expect, it } from "vitest";
import { authorize, type Actor } from "@/lib/auth/authorize";

describe("authorize", () => {
  const staff: Actor = {
    id: "staff-1",
    realm: "staff",
    tenantId: "acme",
    permissions: ["catalog:read"],
  };

  it("allows a permission inside the actor tenant", async () => {
    await expect(
      authorize(staff, "catalog:read", { tenantId: "acme" }),
    ).resolves.toBeUndefined();
  });

  it("rejects tenant crossing", async () => {
    await expect(
      authorize(staff, "catalog:read", { tenantId: "globex" }),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("rejects missing permissions", async () => {
    await expect(
      authorize(staff, "orders:write", { tenantId: "acme" }),
    ).rejects.toThrow("FORBIDDEN");
  });
});
