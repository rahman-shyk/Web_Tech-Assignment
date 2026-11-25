import Link from "next/link";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import CustomerAccount from "@/components/storefront/CustomerAccount";
import { isFeatureAvailableForTenant } from "@/lib/platform/entitlements";
import "@/components/storefront/storefront.css";

export const instant = false;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;
  if (!store || !/^[a-z0-9-]{2,63}$/.test(store)) {
    return (
      <main className="container account-page">
        <h1>Choose a store account</h1>
        <p>Open your account from the store you shop at.</p>
        <Link href="/">Browse stores</Link>
      </main>
    );
  }
  const tenant = await findTenantBySlug(store);
  if (!tenant || tenant.status !== "active") {
    return (
      <main className="container account-page">
        <h1>This store is currently unavailable.</h1>
        <Link href="/">Return home</Link>
      </main>
    );
  }
  if (
    !(await isFeatureAvailableForTenant(tenant, "storefront")) ||
    !(await isFeatureAvailableForTenant(tenant, "orders"))
  ) {
    return (
      <main className="container account-page">
        <h1>This store account is currently unavailable.</h1>
        <Link href={`/store/${tenant.slug}`}>Return to store</Link>
      </main>
    );
  }

  return (
    <CustomerAccount tenantName={tenant.name} tenantSlug={tenant.slug} />
  );
}
