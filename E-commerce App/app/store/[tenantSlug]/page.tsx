import { notFound } from "next/navigation";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import { listProducts } from "@/lib/repositories/products";
import { getTenantDb } from "@/lib/db/tenant";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import TenantStorefront from "@/components/storefront/TenantStorefront";

export const instant = false;

export default async function TenantStorefrontPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  if (tenant.status !== "active") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <h1>This store is currently unavailable.</h1>
      </main>
    );
  }
  const [storefrontAvailable, catalogAvailable] = await Promise.all([
    isFeatureAvailableForTenant(tenant, "storefront"),
    isFeatureAvailableForTenant(tenant, "catalog"),
  ]);
  if (!storefrontAvailable) notFound();
  const products = catalogAvailable ? await listProducts(tenant._id) : [];
  const db = await getTenantDb(tenant._id);
  const settings = await db.collection("settings").findOne({ tenantId: tenant._id });

  const tenantProducts = products.map((product) => ({
    _id: String(product._id),
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    stock: product.stock,
  }));

  return (
    <TenantStorefront
      tenantName={String(settings?.name ?? tenant.name)}
      tenantSlug={tenantSlug}
      products={tenantProducts}
    />
  );
}
