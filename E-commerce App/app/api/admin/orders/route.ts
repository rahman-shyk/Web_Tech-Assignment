import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantDb } from "@/lib/db/tenant";
import type { OrderRecord } from "@/lib/orders/service";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import { resolveStaffAccess } from "@/lib/auth/staffAccess";

const statusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
]);

export async function GET(request: NextRequest) {
  const access = await resolveStaffAccess("orders:read");
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { session, tenant } = access;
  if (!(await isFeatureAvailableForTenant(tenant, "orders"))) {
    return NextResponse.json({ error: "FEATURE_UNAVAILABLE" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const parsedStatus = status ? statusSchema.safeParse(status) : null;
  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  const escapedQuery = query?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = {
    tenantId: session.tenantId,
    ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
    ...(escapedQuery
      ? {
          $or: [
            { number: { $regex: escapedQuery, $options: "i" } },
            { "customer.name": { $regex: escapedQuery, $options: "i" } },
            { "customer.email": { $regex: escapedQuery, $options: "i" } },
          ],
        }
      : {}),
  };
  const orders = await (await getTenantDb(session.tenantId))
    .collection<OrderRecord>("orders")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order._id,
      number: order.number,
      customer: order.customer,
      address: order.address,
      items: order.items,
      totals: order.totals,
      currency: order.currency,
      payment: order.payment,
      status: order.status,
      createdAt: order.createdAt,
    })),
  });
}
