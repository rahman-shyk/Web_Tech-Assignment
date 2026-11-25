import { NextResponse } from "next/server";
import { z } from "zod";
import { updateProduct, deleteProduct } from "@/lib/repositories/products";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import { resolveStaffAccess } from "@/lib/auth/staffAccess";

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  image: z.string().url().optional().or(z.literal("").optional()),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
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
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const { productId } = await context.params;
  const product = await updateProduct(session.tenantId, productId, parsed.data);
  return NextResponse.json({ product });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const access = await resolveStaffAccess("catalog:write");
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { session, tenant } = access;
  if (!(await isFeatureAvailableForTenant(tenant, "catalog"))) {
    return NextResponse.json({ error: "FEATURE_UNAVAILABLE" }, { status: 403 });
  }
  const { productId } = await context.params;
  await deleteProduct(session.tenantId, productId);
  return NextResponse.json({ ok: true });
}
