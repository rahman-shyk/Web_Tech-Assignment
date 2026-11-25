import { describe, expect, it } from "vitest";
import { evaluateFeatureEntitlement } from "@/lib/platform/entitlements";

describe("platform feature entitlements", () => {
  const enabled = {
    tenantActive: true,
    planEnabled: true,
    featureEnabled: true,
    planFeatureVersion: 1,
    currentFeatureVersion: 1,
  };

  it("allows an active tenant when its enabled plan includes the current feature version", () => {
    expect(evaluateFeatureEntitlement(enabled)).toBe(true);
  });

  it("denies unavailable tenant, plan, or feature states", () => {
    expect(evaluateFeatureEntitlement({ ...enabled, tenantActive: false })).toBe(false);
    expect(evaluateFeatureEntitlement({ ...enabled, planEnabled: false })).toBe(false);
    expect(evaluateFeatureEntitlement({ ...enabled, featureEnabled: false })).toBe(false);
    expect(
      evaluateFeatureEntitlement({ ...enabled, currentFeatureVersion: 2 }),
    ).toBe(false);
  });
});
