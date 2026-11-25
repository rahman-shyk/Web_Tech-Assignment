import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/sessions";
import { getTenantDb } from "@/lib/db/tenant";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import type { Document } from "@/lib/db/types";

type CustomerRecord = Omit<Document, "_id"> & {
  _id: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
};

const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine((password) => new TextEncoder().encode(password).length <= 72);

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: passwordSchema,
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
  if (!checkRateLimit(`customer-register:${tenantSlug}:${ip}`, 5, 900_000).allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
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

  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    return NextResponse.json({ error: "STORE_UNAVAILABLE" }, { status: 404 });
  }
  const [storefrontAvailable, ordersAvailable] = await Promise.all([
    isFeatureAvailableForTenant(tenant, "storefront"),
    isFeatureAvailableForTenant(tenant, "orders"),
  ]);
  if (!storefrontAvailable || !ordersAvailable) {
    return NextResponse.json({ error: "STORE_UNAVAILABLE" }, { status: 404 });
  }
  const customers =
    (await getTenantDb(tenant._id)).collection<CustomerRecord>("customers");
  const existing = await customers.findOne({
    tenantId: tenant._id,
    email: parsed.data.email,
  });
  if (typeof existing?.passwordHash === "string") {
    return NextResponse.json({ error: "ACCOUNT_ALREADY_EXISTS" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const customerId = existing ? String(existing._id) : randomUUID();
  if (existing) {
    await customers.updateOne(
      { _id: existing._id, tenantId: tenant._id },
      {
        $set: {
          name: parsed.data.name,
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );
  } else {
    await customers.insertOne({
      _id: customerId,
      tenantId: tenant._id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: "",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await createSession({
    realm: "customer",
    id: customerId,
    tenantId: tenant._id,
    email: parsed.data.email,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
