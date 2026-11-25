import { getPlatformDb } from "@/lib/db/platform";
import { ConflictError, NotFoundError } from "@/lib/db/repository";
import { assertTenantId } from "@/lib/db/tenant";
import { findPlatformPlan, PlatformCatalogError } from "@/lib/platform/catalog";
import { canTransitionTenantStatus, type TenantStatus } from "@/lib/platform/tenant-state";

export type { TenantStatus } from "@/lib/platform/tenant-state";

export type TenantRecord = Record<string, unknown> & {
  _id: string;
  name: string;
  slug: string;
  customDomain?: string;
  status: TenantStatus;
  ownerEmail: string;
  planId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function tenantsCollection() {
  return (await getPlatformDb()).collection<TenantRecord>("tenants");
}

export async function findTenantBySlug(slug: string): Promise<TenantRecord | null> {
  if (!/^[a-z0-9-]{2,63}$/.test(slug)) return null;
  assertTenantId(slug);
  return (await tenantsCollection()).findOne({ slug });
}

export async function findTenantById(id: string): Promise<TenantRecord | null> {
  assertTenantId(id);
  return (await tenantsCollection()).findOne({ _id: id });
}

export async function createTenant(input: {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  planId?: string;
}): Promise<TenantRecord> {
  assertTenantId(input.id);
  assertTenantId(input.slug);
  const planId = input.planId ?? "starter";
  const plan = await findPlatformPlan(planId);
  if (!plan || !plan.enabled) {
    throw new PlatformCatalogError("PLAN_UNAVAILABLE", 409);
  }
  const collection = await tenantsCollection();
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ ownerEmail: 1 });
  const now = new Date();
  if (await collection.findOne({ $or: [{ _id: input.id }, { slug: input.slug }] })) {
    throw new ConflictError("A store with that slug already exists");
  }
  const tenant: TenantRecord = {
    _id: input.id,
    name: input.name,
    slug: input.slug,
    status: "pending",
    ownerEmail: input.ownerEmail.toLowerCase(),
    planId,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(tenant);
  return tenant;
}

export async function updateTenantPlan(
  id: string,
  planId: string,
): Promise<TenantRecord> {
  assertTenantId(id);
  const plan = await findPlatformPlan(planId);
  if (!plan || !plan.enabled) {
    throw new PlatformCatalogError("PLAN_UNAVAILABLE", 409);
  }
  const result = await (await tenantsCollection()).findOneAndUpdate(
    { _id: id },
    { $set: { planId, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new NotFoundError("Tenant");
  return result;
}

export async function updateTenantStatus(
  id: string,
  status: TenantStatus,
): Promise<TenantRecord> {
  const collection = await tenantsCollection();
  const current = await collection.findOne({ _id: id });
  if (!current) throw new NotFoundError("Tenant");
  if (!canTransitionTenantStatus(current.status, status)) {
    throw new ConflictError("Invalid tenant status transition");
  }
  const result = await collection.findOneAndUpdate(
    { _id: id, status: current.status },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new ConflictError("Tenant status changed concurrently");
  return result;
}
