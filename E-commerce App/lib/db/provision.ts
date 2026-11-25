import { getPlatformDb } from "@/lib/db/platform";
import { getTenantDb } from "@/lib/db/tenant";
import { ensurePlatformCatalog } from "@/lib/platform/catalog";
import { createTenant, type TenantRecord } from "@/lib/repositories/tenants";

export async function provisionTenant(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  planId?: string;
}): Promise<TenantRecord> {
  await ensurePlatformCatalog();
  const tenant = await createTenant({
    id: input.slug,
    name: input.name,
    slug: input.slug,
    ownerEmail: input.ownerEmail,
    planId: input.planId,
  });

  const db = await getTenantDb(tenant._id);
  await db.collection("settings").updateOne(
    { tenantId: tenant._id },
    {
      $setOnInsert: {
        tenantId: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        currency: "USD",
        locale: "en",
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  await db.collection("staff").createIndex(
    { tenantId: 1, email: 1 },
    { unique: true },
  );
  await db.collection("products").createIndex(
    { active: 1, createdAt: -1 },
  );
  await db.collection("orders").createIndex(
    { tenantId: 1, createdAt: -1 },
  );
  await db.collection("orders").createIndex(
    { number: 1 },
    { unique: true, sparse: true },
  );
  await db.collection("orders").createIndex(
    { idempotencyKey: 1 },
    {
      unique: true,
      partialFilterExpression: { idempotencyKey: { $type: "string" } },
    },
  );
  await db.collection("orders").createIndex({ status: 1, createdAt: -1 });
  await db.collection("orders").createIndex({ customerId: 1, createdAt: -1 });
  await db.collection("customers").createIndex(
    { tenantId: 1, email: 1 },
    { unique: true },
  );

  const platform = await getPlatformDb();
  await platform.collection("tenants").updateOne(
    { _id: tenant._id } as never,
    { $set: { provisionedAt: new Date(), status: "active" } },
  );

  return tenant;
}
