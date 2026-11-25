import { NextResponse } from "next/server";
import { z } from "zod";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import {
  createStoreOrder,
  OrderServiceError,
  type CreateOrderInput,
} from "@/lib/orders/service";
import { getTenantDb } from "@/lib/db/tenant";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { readSession } from "@/lib/auth/sessions";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(100)
    .superRefine((items, context) => {
      if (new Set(items.map((item) => item.productId)).size !== items.length) {
        context.addIssue({
          code: "custom",
          message: "Duplicate products must be combined into one line",
        });
      }
    }),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    phone: z.string().trim().max(40).optional().default(""),
  }),
  address: z.object({
    line1: z.string().trim().min(2).max(160),
    line2: z.string().trim().max(160).optional().default(""),
    city: z.string().trim().min(2).max(100),
    region: z.string().trim().max(100).optional().default(""),
    postalCode: z.string().trim().min(2).max(24),
    country: z.string().trim().min(2).max(80),
  }),
  paymentMethod: z.literal("cash_on_delivery"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await context.params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(`checkout:${tenantSlug}:${ip}`, 10, 60_000).allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
    return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    return NextResponse.json({ error: "STORE_UNAVAILABLE" }, { status: 404 });
  }
  const [storefrontAvailable, catalogAvailable, ordersAvailable] = await Promise.all([
    isFeatureAvailableForTenant(tenant, "storefront"),
    isFeatureAvailableForTenant(tenant, "catalog"),
    isFeatureAvailableForTenant(tenant, "orders"),
  ]);
  if (!storefrontAvailable || !catalogAvailable || !ordersAvailable) {
    return NextResponse.json({ error: "STORE_UNAVAILABLE" }, { status: 404 });
  }

  const customerSession = await readSession("customer");
  if (
    customerSession?.realm === "customer" &&
    customerSession.tenantId === tenant._id &&
    customerSession.email !== parsed.data.customer.email
  ) {
    return NextResponse.json({ error: "CUSTOMER_EMAIL_MISMATCH" }, { status: 400 });
  }

  const input: CreateOrderInput = {
    items: parsed.data.items,
    customer: parsed.data.customer,
    address: parsed.data.address,
  };

  try {
    const order = await createStoreOrder(
      await getTenantDb(tenant._id),
      tenant._id,
      input,
      idempotencyKey,
    );
    return NextResponse.json(
      {
        order: {
          id: order._id,
          number: order.number,
          status: order.status,
          currency: order.currency,
          totals: order.totals,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json(
        { error: error.code },
        { status: error.status },
      );
    }
    console.error(
      "Order creation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "ORDER_CREATION_FAILED" }, { status: 503 });
  }
}
