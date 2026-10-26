# Going live: developer checklist

Two apps, deployed separately. Nothing here has been done for you: no push, no deploy.

```
Customer's browser
   ├── https://shop.example.com   Next.js website   (e-commerece-frontend)
   └── https://api.example.com    NestJS API         (e-commerece-backend) ── PostgreSQL
```

## 1. Use one domain for both (important for sign-in)

The website's own server reads the sign-in cookies (`admin_token`, `customer_token`, `cart_token`) to render
account and admin pages. Cookies set by `api.example.com` are only sent to the website if they are set for
the **parent domain**. So:

- Put the website and the API on subdomains of one domain (`shop.example.com` and `api.example.com`).
- Backend: `COOKIE_DOMAIN=.example.com` and `FRONTEND_URL=https://shop.example.com`.
- A website on `*.vercel.app` with an API on another domain will **not** keep people signed in. Add your own
  domain to Vercel first.

## 2. Backend

Needs Node 22 and PostgreSQL.

```bash
cd e-commerece-backend
npm ci
npx prisma generate
npx prisma migrate deploy            # never `migrate dev` or `db push` on the live database
SEED_SAMPLE_PRODUCTS=false npx prisma db seed   # owner account, settings, currencies, shipping, menus, homepage
npm run build
npm run start:prod
```

Environment variables (see `.env.example` for every one, with comments). Required in production:

| Variable | Notes |
|---|---|
| `NODE_ENV=production` | turns on secure cookies |
| `DATABASE_URL` | live PostgreSQL |
| `FRONTEND_URL` | the website address (comma-separated list allowed) |
| `COOKIE_DOMAIN` | e.g. `.example.com` (see section 1) |
| `JWT_SECRET`, `CUSTOMER_JWT_SECRET`, `REVALIDATE_SECRET` | random, 32+ characters each, all different (`openssl rand -hex 32`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | the owner's login (12+ character password) |
| `TRUST_PROXY=1` | when behind a load balancer, so rate limits see the real IP |
| `FRONTEND_REVALIDATE_URL` | `https://shop.example.com/api/revalidate` |
| `STORAGE_DRIVER=cloudinary` + `CLOUDINARY_*` | rotate the API secret first (it was shared in chat earlier) |
| `MAIL_DRIVER=smtp` + `SMTP_*` + `MAIL_FROM` | or `MAIL_DRIVER=provider` + `RESEND_API_KEY` |
| `PAYMENTS_DRIVER=live` + the provider keys below | never `fake` in production (the server refuses it) |
| `SCHEDULER_ENABLED=true` | releases unpaid orders after 30 minutes. Safe with several servers (advisory locks) |

Payment keys (use **sandbox/test** keys first, switch to live only after a full test order):

| Provider | Variables |
|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Square | `SQUARE_ENVIRONMENT`, `SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_URL` |
| PayPal | `PAYPAL_ENVIRONMENT`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |

Webhooks (create these in each provider's dashboard once the API is online):

- Stripe: `https://api.example.com/api/webhooks/stripe`. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.processing`, `refund.created`, `refund.updated`, `refund.failed`, `charge.dispute.created`.
- Square: `https://api.example.com/api/webhooks/square`. Events: `payment.created`, `payment.updated`, `refund.created`, `refund.updated`, `dispute.created`. `SQUARE_WEBHOOK_URL` must match this address exactly.
- PayPal: `https://api.example.com/api/webhooks/paypal`. Events: `PAYMENT.CAPTURE.COMPLETED`, `.PENDING`, `.DENIED`, `.DECLINED`, `.REFUNDED`, `.REVERSED`, and `PAYMENT.REFUND.PENDING`, `PAYMENT.REFUND.FAILED`.

Health check: `GET /api/health`.

### Hosting the backend on a Node host such as Hostinger

- **The database must be PostgreSQL.** Most shared hosting only offers MySQL, which this app cannot use.
  Create a free or paid PostgreSQL database elsewhere (Neon, Supabase, Railway, Render) and put its
  connection string in `DATABASE_URL`.
- Settings in the host's panel: root directory `e-commerece-backend`, Node 22, install command
  `npm install`, build command `npm run build`, start command `node dist/main.js` (output folder `dist`).
  The build also runs `prisma generate` by itself (the `prebuild` script), and the build tools are normal
  dependencies, so a production-only install works.
- Put every variable from section 2 in the host's environment-variables page. Do not commit `.env`.

### Running the migrations and the seeder (once, from your own computer)

The host usually has no terminal, so run them from your computer against the live database. The database
must accept outside connections (Neon and Supabase do).

PowerShell:

```powershell
cd e-commerece-backend
npm install
$env:DATABASE_URL = "postgresql://user:password@host:5432/dbname?sslmode=require"
$env:SEED_ADMIN_EMAIL = "owner@yourshop.com"
$env:SEED_ADMIN_PASSWORD = "a-long-password-12-chars-or-more"
$env:SEED_ADMIN_NAME = "Store Owner"
$env:SEED_SAMPLE_PRODUCTS = "false"
npm run db:migrate    # creates all the tables
npm run db:seed       # owner login, settings, currencies, shipping, menus, homepage, categories, filters
```

The seeder is safe to run again (it never overwrites what the owner has changed or an existing password).
If the host does give you a terminal or SSH, run the same two npm commands there instead.

## 3. Website (Vercel or any Node host)

```bash
cd e-commerece-frontend
npm ci
npm run build
npm run start      # or deploy on Vercel
```

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.example.com/api` (build-time: set it before building) |
| `NEXT_PUBLIC_SITE_URL` | `https://shop.example.com` |
| `REVALIDATE_SECRET` | the same value as the backend's |

Security headers (nosniff, frame, referrer, HSTS, permissions) are set in `next.config.ts`. A
Content-Security-Policy is **not** set yet: write and test one with the real Square, Stripe, PayPal,
Google and Meta scripts once their keys are in.

Add the API's image host to `images.remotePatterns` in `next.config.ts` if you use S3/R2 instead of Cloudinary.

## 4. After it is online

1. Sign in at `/admin` and change nothing yet. Place a **test order with each payment method** using the
   providers' test cards, then refund it from Admin → Orders.
2. Check the order confirmation and shipping emails arrive and are not in spam (set up SPF/DKIM for the
   sending domain with your email provider).
3. Submit `https://shop.example.com/sitemap.xml` in Google Search Console. `robots.txt` is served automatically.
4. In Meta Commerce Manager add the data feed `https://api.example.com/api/feeds/meta.csv`. Add the
   Pixel ID and Google Analytics ID in Admin → Settings. Check the events in Meta Events Manager and
   GA4 DebugView (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`).
5. Replace the placeholder wording (Returns, Shipping, FAQ, About) with the shop's real policies.
   The text in the development database was invented.
6. Confirm the brand spelling ("Malikah" or "Malaikah") and update `src/config/brand.ts`, the page
   titles and `StoreSettings.storeName`.
7. Turn on automatic **database backups** with your hosting provider, and test restoring one.

## 5. Things to know

- Pages for products and CMS content are cached and refreshed when the owner saves a change (the backend
  calls `/api/revalidate`). If the owner edits something and does not see it, check
  `FRONTEND_REVALIDATE_URL` and that `REVALIDATE_SECRET` matches on both sides. The first visit after a
  change may still show the old page once (the new copy is built in the background).
- `PAYMENTS_DRIVER=fake` exists for automated tests only.
- Rate limits are kept in memory. With several API servers, switch the throttler to a Redis store.
- Run `npm audit --omit=dev` in both folders from time to time. Both were clean when this was written.
- Tests: backend `npm run test` and `npm run test:e2e`; frontend `npm run lint`.
