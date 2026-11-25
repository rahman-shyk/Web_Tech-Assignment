import { getPlatformDb } from "@/lib/db/platform";
import {
  ensurePlatformCatalog,
  type FeatureKey,
  type PlatformFeatureRecord,
  type PlatformPlanRecord,
} from "@/lib/platform/catalog";
import type { TenantRecord } from "@/lib/repositories/tenants";

export function evaluateFeatureEntitlement(input: {
  tenantActive: boolean;
  planEnabled: boolean;
  featureEnabled: boolean;
  planFeatureVersion: number | undefined;
  currentFeatureVersion: number | undefined;
}): boolean {
  return Boolean(
    input.tenantActive &&
      input.planEnabled &&
      input.featureEnabled &&
      input.currentFeatureVersion !== undefined &&
      input.planFeatureVersion === input.currentFeatureVersion,
  );
}

export async function isFeatureAvailableForTenant(
  tenant: Pick<TenantRecord, "planId" | "status">,
  featureKey: FeatureKey,
): Promise<boolean> {
  if (tenant.status !== "active") return false;
  await ensurePlatformCatalog();
  const db = await getPlatformDb();
  const [plan, feature] = await Promise.all([
    db.collection<PlatformPlanRecord>("plans").findOne({ _id: tenant.planId }),
    db.collection<PlatformFeatureRecord>("features").findOne({ _id: featureKey }),
  ]);
  return evaluateFeatureEntitlement({
    tenantActive: tenant.status === "active",
    planEnabled: plan?.enabled ?? false,
    featureEnabled: feature?.enabled ?? false,
    planFeatureVersion: plan?.features[featureKey],
    currentFeatureVersion: feature?.version,
  });
}
