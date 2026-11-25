# SRS Implementation Status

The attached AI-Build SRS v1.0 is a multi-phase product specification, not a
single finished assignment checklist. This repository is a working MVP
foundation; the phases below describe implementation status, not a claim that
every acceptance criterion in the PDF has passed.

## Phase status

| Phase | Status | Implemented | Significant remaining work |
| --- | --- | --- | --- |
| 0. Foundation and tooling | Mostly complete | Next.js, strict TypeScript, MongoDB access layer, tenant database selection, session primitives, bilingual foundations, adapters, lint/test/build setup | Durable job provider, broader isolation and browser test coverage |
| 1. Platform core | Partial | Platform login, tenant listing/search/create/status with guarded lifecycle transitions, plan CRUD and assignment, versioned feature catalog, global and per-plan feature enforcement | 2FA, audit viewer |
| 2. Registration and provisioning | Partial | Owner signup, tenant database setup and indexes, owner credentials/session, default Starter plan | Email verification, paid plan selection/billing, durable/retryable provisioning, reserved-slug checks |
| 3. Store admin, staff and security | Partial | Owner login, basic dashboard, product management, order list/status UI, plan entitlement checks on protected APIs, persisted staff identity and permission checks | Staff invitations and management UI, settings, audit views, 2FA |
| 4. Catalog and inventory | Partial | Tenant-scoped product create/edit/soft-delete and stock quantities | Variants, categories/collections, uploads, CSV jobs, inventory ledger and reservations |
| 5. Storefront, cart, checkout and payments | Partial | Tenant storefront, browser cart, guest COD checkout, tenant-scoped customer login/registration/order history, server-side price/stock validation, idempotent order creation, and storefront/order feature enforcement | Gateway/bank transfer, saved addresses, verification/reset email, cart server sync, shipping zones/discounts and expanded storefront search/SEO |
| 6. Orders and fulfillment | Partial | Order timeline events, permitted status transitions, staff list, transactional stock release on cancellation | Shipment/tracking, returns/refunds, invoices, notifications and full lifecycle tests |
| 7. Subscription billing and domains | Not started | — | Plan billing, renewal jobs, restricted mode, custom-domain verification |
| 8. Analytics, growth, branding and backups | Not started | — | Aggregates, configurable branding, export/restore and related jobs |
| 9. Marketing, CRM and loyalty | Deferred | — | SRS Phase 9 features |
| 10. Visual editor and extensibility | Deferred | — | SRS Phase 10 features |
| 11. AI and premium modules | Deferred | — | SRS Phase 11 features |

## Decisions and operational prerequisites

- The demo checkout accepts cash on delivery only. It never accepts or stores
  card numbers or CVV.
- Amounts are calculated server-side in integer minor units. Optional tenant
  tax and flat/free-shipping settings default to zero until configured.
- Order creation and inventory changes require MongoDB transaction support
  (MongoDB replica set or Atlas).
- A Netlify preview needs its own environment configuration and an accessible
  MongoDB replica-set database. Do not copy `.env.local` into a deployment.
- The latest credential-safe health probe returned `MONGODB_UNAVAILABLE`; a
  local environment check detected the documented placeholder URI, so no Atlas
  connection or database write was attempted.
- Netlify is signed in and connected to the GitHub repository. The app source
  is published on the `netlify-preview` branch, but no site has been created
  or deployed. Finish setup only after an isolated staging URI is available.
- Production publishing, real payment providers, subscription pricing, email
  delivery and legal/tax rules require separate explicit decisions.

## Validation snapshot

After the latest staff authorization changes, `npm run typecheck` passes,
`npm test` passes 20 tests, `npm run lint` has no errors, and `npm run build`
passes. ESLint still reports five existing `<img>` performance warnings. A
production-browser smoke test of `/super-admin` found no CSP script/style
violations; unauthenticated platform API probes returned expected 401s.
Database-backed flows still require a configured MongoDB replica-set.
