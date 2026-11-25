import { NextResponse } from "next/server";
import type { Document } from "@/lib/db/types";
import { readSession } from "@/lib/auth/sessions";
import { getTenantDb } from "@/lib/db/tenant";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";

type CustomerRecord = Omit<Document, "_id"> & {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
};

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
  const customer = await (await getTenantDb(tenant._id))
    .collection<CustomerRecord>("customers")
    .findOne(
      { tenantId: tenant._id, email: session.email },
      { projection: { name: 1, email: 1, phone: 1 } },
    );
  if (!customer || String(customer._id) !== session.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
}
