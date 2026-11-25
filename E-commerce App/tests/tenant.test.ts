import { describe, expect, it } from "vitest";
import { assertTenantId } from "@/lib/db/tenant";
import { resolveTenantFromHost } from "@/lib/tenant";

describe("tenant isolation", () => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017";
  process.env.APP_URL = "http://localhost:3000";

  it("accepts safe tenant ids", () => {
    expect(() => assertTenantId("acme-store")).not.toThrow();
  });

  it("rejects unsafe tenant ids", () => {
    expect(() => assertTenantId("../admin")).toThrow("Invalid tenant id");
  });

  it("resolves a subdomain tenant", () => {
    process.env.TENANT_HOST_MAP = '{"localhost":"acme"}';
    expect(resolveTenantFromHost("store.acme.test")).toBe("store");
  });
});
