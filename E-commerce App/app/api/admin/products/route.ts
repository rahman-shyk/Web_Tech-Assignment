import { NextResponse } from "next/server";
import { z } from "zod";
import { listProducts, createProduct } from "@/lib/repositories/products";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import { resolveStaffAccess } from "@/lib/auth/staffAccess";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  image: z.string().url().optional().or(z.literal("")),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  const access = await resolveStaffAccess("catalog:read");
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { session, tenant } = access;
  if (!(await isFeatureAvailableForTenant(tenant, "catalog"))) {
    return NextResponse.json({ error: "FEATURE_UNAVAILABLE" }, { status: 403 });
  }
  return NextResponse.json({ products: await listProducts(session.tenantId) });
}

export async function POST(request: Request) {
  const access = await resolveStaffAccess("catalog:write");
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { session, tenant } = access;
  if (!(await isFeatureAvailableForTenant(tenant, "catalog"))) {
    return NextResponse.json({ error: "FEATURE_UNAVAILABLE" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }
  const product = await createProduct(session.tenantId, parsed.data);
  return NextResponse.json({ product }, { status: 201 });
}
