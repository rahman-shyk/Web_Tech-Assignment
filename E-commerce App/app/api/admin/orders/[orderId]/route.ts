import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantDb } from "@/lib/db/tenant";
import { OrderServiceError, transitionOrder } from "@/lib/orders/service";
import { orderStatuses } from "@/lib/orders/state";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import { resolveStaffAccess } from "@/lib/auth/staffAccess";

const schema = z.object({
  status: z.enum(orderStatuses),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const access = await resolveStaffAccess("orders:write");
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { session, tenant } = access;
  if (!(await isFeatureAvailableForTenant(tenant, "orders"))) {
    return NextResponse.json({ error: "FEATURE_UNAVAILABLE" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { orderId } = await context.params;
  try {
    const order = await transitionOrder(
      await getTenantDb(session.tenantId),
      session.tenantId,
      orderId,
      parsed.data.status,
      session.id,
    );
    if (!order) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      order: { id: order._id, number: order.number, status: order.status },
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json(
        {
          error: error.code,
          allowedStatuses:
            error.code === "INVALID_TRANSITION" ? error.allowedStatuses : undefined,
        },
        { status: error.status },
      );
    }
    console.error(
      "Order status update failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "ORDER_UPDATE_FAILED" }, { status: 503 });
  }
}
