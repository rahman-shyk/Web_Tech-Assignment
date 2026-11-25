import Link from "next/link";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import { getTenantDb } from "@/lib/db/tenant";
import CheckoutForm from "@/components/storefront/CheckoutForm";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import "@/components/storefront/storefront.css";

export const instant = false;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;
  if (!store || !/^[a-z0-9-]{2,63}$/.test(store)) {
    return (
      <main className="container" style={{ minHeight: "100vh", paddingBlock: 48 }}>
        <h1>Choose a store to check out</h1>
        <p>Open a store and add items to your cart before checking out.</p>
        <Link href="/" className="primary-button">Browse stores</Link>
      </main>
    );
  }

  const tenant = await findTenantBySlug(store);
  if (!tenant || tenant.status !== "active") {
    return (
      <main className="container" style={{ minHeight: "100vh", paddingBlock: 48 }}>
        <h1>This store is currently unavailable.</h1>
        <Link href="/">Return home</Link>
      </main>
    );
  }
  if (
    !(await isFeatureAvailableForTenant(tenant, "storefront")) ||
    !(await isFeatureAvailableForTenant(tenant, "catalog")) ||
    !(await isFeatureAvailableForTenant(tenant, "orders"))
  ) {
    return (
      <main className="container" style={{ minHeight: "100vh", paddingBlock: 48 }}>
        <h1>Checkout is currently unavailable.</h1>
        <Link href={`/store/${tenant.slug}`} className="primary-button">Return to store</Link>
      </main>
    );
  }
  const settings = await (await getTenantDb(tenant._id))
    .collection("settings")
    .findOne({ tenantId: tenant._id });
  const currency =
    typeof settings?.currency === "string" && /^[A-Z]{3}$/.test(settings.currency)
      ? settings.currency
      : "USD";

  return (
    <main className="container checkout-page">
      <CheckoutForm
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        currency={currency}
      />
    </main>
  );
}
