import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/sessions";
import { getTenantDb } from "@/lib/db/tenant";
import type { OrderRecord } from "@/lib/orders/service";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await context.params;
  const session = await readSession("customer");
  if (!session || session.realm !== "customer") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active" || session.tenantId !== tenant._id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const [storefrontAvailable, ordersAvailable] = await Promise.all([
    isFeatureAvailableForTenant(tenant, "storefront"),
    isFeatureAvailableForTenant(tenant, "orders"),
  ]);
  if (!storefrontAvailable || !ordersAvailable) {
    return NextResponse.json({ error: "FEATURE_UNAVAILABLE" }, { status: 403 });
  }
  const orders = await (await getTenantDb(tenant._id))
    .collection<OrderRecord>("orders")
    .find(
      { tenantId: tenant._id, customerId: session.id },
      {
        projection: {
          number: 1,
          status: 1,
          currency: 1,
          totals: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return NextResponse.json({ orders });
}
