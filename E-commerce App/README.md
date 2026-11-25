# Commerce SaaS MVP

A Next.js multi-tenant ecommerce SaaS MVP based on the included AI-Build SRS.
The repository is a partial implementation of the 11-phase specification; see
[docs/PROGRESS.md](./docs/PROGRESS.md) before treating it as production-ready.

## Start

```powershell
cd "D:\University-Stuff\Web-Tech\E-commerce App"
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:APP_URL="http://localhost:3000"
npm run dev
```

## Application routes

- `/` - Demo storefront
- `/store/<tenantSlug>` - Tenant storefront and browser cart
- `/checkout?store=<tenantSlug>` - Tenant checkout (cash on delivery)
- `/account?store=<tenantSlug>` - Tenant customer account and order history
- `/register` - Store owner registration
- `/admin` - Store owner dashboard, product catalog and order fulfillment
- `/super-admin` - Tenant administration, plans, and feature availability
- `/platform` - Redirect to platform administration
- `/api/health` - Health endpoint

## Netlify preview prerequisites

Connect the project to a Netlify site and configure the required environment
variables in that site's **Preview/Deploy Preview** context:

- `MONGODB_URI` - an isolated MongoDB replica-set database (transactions are
  required for checkout); allow the Netlify runtime to connect.
- `APP_URL` - the exact preview URL.
- `AUTH_SECRET` - a private value of at least 32 characters.
- `PLATFORM_DB_NAME` - optional; defaults to `platform`.
- `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD_HASH` - optional until the
  platform admin is needed.

Never commit or upload `.env.local` or paste database/auth secrets into chat.
Use a staging database for previews. A preview deployment is not a production
launch and does not configure real payment processing.

The platform plan catalog controls feature availability for active tenants.
Subscription pricing and recurring billing are intentionally not implemented
until those rules and a billing provider are selected.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
