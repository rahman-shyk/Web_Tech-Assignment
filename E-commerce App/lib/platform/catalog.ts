import type { Document } from "@/lib/db/types";
import { getPlatformDb } from "@/lib/db/platform";

export const featureKeys = ["storefront", "catalog", "orders"] as const;

export const featureDefinitions = [
  {
    key: "storefront",
    name: "Storefront",
    description: "Publish a tenant-specific customer storefront.",
    version: 1,
  },
  {
    key: "catalog",
    name: "Product catalog",
    description: "Manage products and display them in the storefront.",
    version: 1,
  },
  {
    key: "orders",
    name: "Orders and checkout",
    description: "Accept cash-on-delivery orders and manage fulfillment.",
    version: 1,
  },
] as const;

export type FeatureKey = (typeof featureKeys)[number];

export function isFeatureKey(value: string): value is FeatureKey {
  return featureKeys.some((key) => key === value);
}

export type PlatformFeatureRecord = Omit<Document, "_id"> & {
  _id: FeatureKey;
  key: FeatureKey;
  name: string;
  description: string;
  enabled: boolean;
  version: number;
  updatedAt: Date;
};

export type PlatformPlanRecord = Omit<Document, "_id"> & {
  _id: string;
  name: string;
  description: string;
  enabled: boolean;
  features: Partial<Record<FeatureKey, number>>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export class PlatformCatalogError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "PlatformCatalogError";
  }
}

let catalogReady: Promise<void> | undefined;

async function seedPlatformCatalog(): Promise<void> {
  const db = await getPlatformDb();
  const features = db.collection<PlatformFeatureRecord>("features");
  const plans = db.collection<PlatformPlanRecord>("plans");
  const now = new Date();

  await Promise.all(
    featureDefinitions.map((feature) =>
      features.updateOne(
        { _id: feature.key },
        {
          $setOnInsert: {
            ...feature,
            enabled: true,
            updatedAt: now,
          },
        },
        { upsert: true },
      ),
    ),
  );

  const starterFeatures = Object.fromEntries(
    featureDefinitions.map((feature) => [feature.key, feature.version]),
  ) as Record<FeatureKey, number>;

  await plans.updateOne(
    { _id: "starter" },
    {
      $setOnInsert: {
        name: "Starter",
        description: "Core storefront, catalog, and order tools.",
        enabled: true,
        features: starterFeatures,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

export function ensurePlatformCatalog(): Promise<void> {
  if (!catalogReady) {
    catalogReady = seedPlatformCatalog().catch((error: unknown) => {
      catalogReady = undefined;
      throw error;
    });
  }
  return catalogReady;
}

export async function listPlatformCatalog(): Promise<{
  plans: PlatformPlanRecord[];
  features: PlatformFeatureRecord[];
}> {
  await ensurePlatformCatalog();
  const db = await getPlatformDb();
  const [plans, features] = await Promise.all([
    db.collection<PlatformPlanRecord>("plans").find().sort({ name: 1 }).toArray(),
    db.collection<PlatformFeatureRecord>("features").find().sort({ name: 1 }).toArray(),
  ]);
  return { plans, features };
}

export async function findPlatformPlan(
  planId: string,
): Promise<PlatformPlanRecord | null> {
  await ensurePlatformCatalog();
  return (await getPlatformDb())
    .collection<PlatformPlanRecord>("plans")
    .findOne({ _id: planId });
}

async function getFeatureVersions(
  keys: FeatureKey[],
): Promise<Partial<Record<FeatureKey, number>>> {
  const requested = [...new Set(keys)];
  const features = await (await getPlatformDb())
    .collection<PlatformFeatureRecord>("features")
    .find({ _id: { $in: requested } })
    .toArray();
  if (features.length !== requested.length) {
    throw new PlatformCatalogError("FEATURE_NOT_FOUND", 400);
  }
  return Object.fromEntries(
    features.map((feature) => [feature.key, feature.version]),
  ) as Partial<Record<FeatureKey, number>>;
}

export async function createPlatformPlan(input: {
  id: string;
  name: string;
  description: string;
  featureKeys: FeatureKey[];
}): Promise<PlatformPlanRecord> {
  await ensurePlatformCatalog();
  const plans = (await getPlatformDb()).collection<PlatformPlanRecord>("plans");
  if (await plans.findOne({ _id: input.id })) {
    throw new PlatformCatalogError("PLAN_ALREADY_EXISTS", 409);
  }

  const now = new Date();
  const plan: PlatformPlanRecord = {
    _id: input.id,
    name: input.name,
    description: input.description,
    enabled: true,
    features: await getFeatureVersions(input.featureKeys),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await plans.insertOne(plan);
  return plan;
}

export async function updatePlatformPlan(
  id: string,
  input: {
    name: string;
    description: string;
    enabled: boolean;
    featureKeys: FeatureKey[];
    version: number;
  },
): Promise<PlatformPlanRecord> {
  await ensurePlatformCatalog();
  const db = await getPlatformDb();
  const plans = db.collection<PlatformPlanRecord>("plans");
  if (!input.enabled) {
    const activeTenantCount = await db
      .collection("tenants")
      .countDocuments({ planId: id, status: "active" });
    if (activeTenantCount > 0) {
      throw new PlatformCatalogError("PLAN_HAS_ACTIVE_TENANTS", 409);
    }
  }
  const result = await plans.findOneAndUpdate(
    { _id: id, version: input.version },
    {
      $set: {
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        features: await getFeatureVersions(input.featureKeys),
        version: input.version + 1,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  if (result) return result;
  if (await plans.findOne({ _id: id })) {
    throw new PlatformCatalogError("PLAN_VERSION_CONFLICT", 409);
  }
  throw new PlatformCatalogError("PLAN_NOT_FOUND", 404);
}

export async function setPlatformFeatureEnabled(
  key: FeatureKey,
  enabled: boolean,
): Promise<PlatformFeatureRecord> {
  await ensurePlatformCatalog();
  const result = await (await getPlatformDb())
    .collection<PlatformFeatureRecord>("features")
    .findOneAndUpdate(
      { _id: key },
      { $set: { enabled, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
  if (!result) throw new PlatformCatalogError("FEATURE_NOT_FOUND", 404);
  return result;
}
