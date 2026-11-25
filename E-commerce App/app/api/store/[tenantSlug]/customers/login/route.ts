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
  passwordHash?: string;
};

const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine((password) => new TextEncoder().encode(password).length <= 72);

const schema = z.object({
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
  if (!checkRateLimit(`customer-login:${tenantSlug}:${ip}`, 5, 900_000).allowed) {
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
  const customer = await (await getTenantDb(tenant._id))
    .collection<CustomerRecord>("customers")
    .findOne({ tenantId: tenant._id, email: parsed.data.email });
  if (
    !customer ||
    typeof customer.passwordHash !== "string" ||
    !(await bcrypt.compare(parsed.data.password, customer.passwordHash))
  ) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await createSession({
    realm: "customer",
    id: String(customer._id),
    tenantId: tenant._id,
    email: parsed.data.email,
  });
  return NextResponse.json({ ok: true });
}
