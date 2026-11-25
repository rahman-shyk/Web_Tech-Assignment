# Technical Decisions

## Phase 0

- **Framework:** Next.js App Router with strict TypeScript.
- **Database:** MongoDB Atlas-compatible MongoDB driver with one cached client per runtime.
- **Tenant database:** `t_<tenantId>`.
- **Auth library:** Auth.js (next-auth) is the intended library. Three realms remain separate: platform, tenant staff, and customers. No production credentials or provider configuration are committed.
- **Job queue:** in-memory queue is the Phase 0 default. A durable provider remains open.
- **Testing:** Vitest for unit tests; Playwright may be added for end-to-end coverage in later phases.

## Checkout and orders

- **Storefront payment for the MVP:** cash on delivery only. The checkout does
  not collect card data or claim that a payment gateway is connected.
- **Totals:** product prices are re-read from the tenant database and converted
  to integer minor units. Optional tenant tax and flat/free-shipping settings
  default to zero; regional tax and shipping rules remain unconfigured.
- **Inventory and order consistency:** checkout reserves stock, writes the
  order, and records the initial event in one MongoDB transaction. A replica
  set (including MongoDB Atlas) is required; there is no non-atomic fallback.
- **Order status:** `pending → confirmed → processing → packed → shipped →
  delivered → completed`; cancellation is allowed before packing. This is the
  MVP transition table and should be checked against the complete SRS Section 7
  before expanding payment, refund or return workflows.
- **Preview deploys:** use isolated staging data. Do not copy `.env.local` into
  Netlify or configure live payments as part of a preview.

## Plans and feature availability

- **MVP plan catalog:** plans contain enabled state, description, and versioned
  feature entitlements. The Starter plan enables the implemented storefront,
  catalog, and order features.
- **Billing:** plan prices, renewal behavior, and payment collection were not
  specified, so plan management does not claim to charge subscriptions.
- **Feature enforcement:** a feature is available only when the tenant is
  active, its plan is enabled and includes the current feature version, and the
  platform has not globally disabled that feature.
- **Tenant lifecycle:** pending tenants cannot be manually activated; only
  completed provisioning activates them. Active tenants may be suspended or
  archived, suspended tenants may be reactivated or archived, and archived
  tenants cannot be reopened through the status API.
- **Staff authorization:** staff sessions establish identity, but permissions
  are reloaded from the matching active tenant staff record for each protected
  admin request. A stale, inactive, or mismatched staff identity is rejected.

## Content security policy

- **Next.js scripts:** Proxy generates a per-request nonce, and the root layout
  renders dynamically so framework scripts receive it. Inline script execution
  is not enabled; inline style attributes remain allowed for existing UI styles.
