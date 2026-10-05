# Malaikah Bridal Studio — E-Commerce

Storefront and API for Malaikah Bridal Studio. The repo contains two separate npm projects. There is no workspace tooling, so each one is installed and run on its own.

| Folder | Stack | Dev URL |
|---|---|---|
| [`e-commerece-frontend`](e-commerece-frontend) | Next.js 16 (App Router), React 19, Tailwind CSS v4, Redux Toolkit | http://localhost:3001 |
| [`e-commerece-backend`](e-commerece-backend) | NestJS 12, Prisma 7 (PostgreSQL via `@prisma/adapter-pg`), Vitest | http://localhost:3000 |

## Prerequisites

- Node.js (a current LTS release) and npm
- A running PostgreSQL instance

## Getting started

### 1. Backend

```bash
cd e-commerece-backend
npm install
cp .env.example .env        # then fill in DATABASE_URL, JWT_SECRET and the SEED_ADMIN_* values
npx prisma migrate dev      # applies migrations
npx prisma generate         # generates the client into src/generated/prisma (gitignored)
npx prisma db seed          # store settings, currencies, shipping, owner admin, sample catalog (safe to re-run)
npm run start:dev
```

Node 22 is required (`nvm use` picks it up from `.nvmrc`). To check that the API is up and can reach the database, run:

```bash
curl http://localhost:3000/api/health
```

### 2. Frontend (in a new terminal)

```bash
cd e-commerece-frontend
npm install
npm run dev
```

Open http://localhost:3001.

## Environment variables

Backend (`e-commerece-backend/.env`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | none (required) | PostgreSQL connection string |
| `PORT` | `3000` | API port |
| `FRONTEND_URL` | `http://localhost:3001` | Allowed CORS origin(s), comma-separated |
| `NODE_ENV` | `development` | `production` turns on secure cookies |
| `JWT_SECRET` | none (required, 32+ chars) | Signs admin session tokens |
| `ADMIN_SESSION_DAYS` | `7` | How long an admin stays logged in |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | none (seed only) | Owner account created by `npx prisma db seed` |
| `CUSTOMER_JWT_SECRET` | none (required, 32+ chars, different from `JWT_SECRET`) | Signs customer session tokens |
| `CUSTOMER_SESSION_DAYS` | `30` | How long a customer stays logged in |
| `MAIL_DRIVER` / `MAIL_FROM` | `console` | `console` prints emails (password reset links) to the server log |
| `TRUST_PROXY` | `0` | Number of proxies in front of the API, so rate limits see real client IPs |
| `SCHEDULER_ENABLED` | `true` | Background jobs: release unpaid orders after 30 minutes, delete old carts |
| `PAYMENTS_DRIVER` | `live` | `fake` = in-memory providers for automated tests only (refused in production) |
| `STRIPE_*`, `SQUARE_*`, `PAYPAL_*` | empty | Payment providers. Each is optional; an unconfigured provider is simply not offered. See the checklist below |
| `STORAGE_DRIVER`, `UPLOADS_*`, `S3_*` | `local` | Where uploaded images are stored (see `.env.example`) |
| `FRONTEND_REVALIDATE_URL` / `REVALIDATE_SECRET` | empty | Lets the API refresh the storefront cache after admin changes |

The API refuses to start if a required variable is missing or invalid, and says which one.

> The backend only accepts requests from `FRONTEND_URL`. If you change the frontend's port or domain, update `FRONTEND_URL` to match.

## Scripts

Run each script from inside its project folder.

**Frontend**

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on port 3001 |
| `npm run build` / `npm run start` | Build for production, then serve the build |
| `npm run lint` | Run ESLint |

**Backend**

| Command | Description |
|---|---|
| `npm run start:dev` | Start the dev server in watch mode |
| `npm run build` / `npm run start:prod` | Build to `dist/`, then run the build |
| `npm run lint` | Run oxlint |
| `npm run format` | Run Prettier |
| `npm test` | Unit tests (Vitest, `*.spec.ts`) |
| `npm run test:e2e` | E2E tests (Vitest, `*.e2e-spec.ts`) |
| `npm run test:cov` | Unit tests with coverage |
| `npx prisma studio` | Open a database browser |

Run `npx prisma generate` again whenever `prisma/schema.prisma` changes or after a fresh install.

## Project structure

```
e-commerece-frontend/src/
  app/              Routes only: (shop) storefront, (auth) login/register, account/, admin/
  modules/<domain>/ Feature modules (products, cart, checkout, auth, orders, ...),
                    each with api/, components/, hooks/, types/
  shared/           Cross-domain UI components and layouts (Header, Footer, ...)
  infrastructure/   HTTP client, payments and analytics setup
  store/            Redux Toolkit store and slices
  config/           Brand constants (brand.ts) and env access

e-commerece-backend/
  src/              NestJS app: common/ (filter, pagination, money), config/ (env validation), modules/ (auth)
  prisma/seed.ts    Re-runnable development seed
  prisma/           schema.prisma and migrations
  test/             E2E tests
```

The import alias `@/*` points to `src/*` in the frontend.

## Project status

The work is at an early stage:

- **Frontend:** the homepage UI is built in `modules/products`. The other modules and the Redux store are still empty placeholder folders.
- **Backend:** the full schema is migrated and seeded. Endpoints so far: `GET /api/health` and admin auth (`/api/admin/auth/login`, `logout`, `me`). Catalog, cart, orders and payments come next.
- The frontend and backend don't share any type definitions yet.

## Conventions

- The backend is an ES module project, so relative imports must end in `.js` (for example, `import { AppModule } from './app.module.js'`), even though the source files are `.ts`.
- The backend uses **Vitest**, not Jest, and **oxlint**, not ESLint.
- Running `next dev` regenerates `e-commerece-frontend/AGENTS.md`. Commit the file as it is; don't delete it.
- For AI-assisted development, see [`CLAUDE.md`](CLAUDE.md).

## Payments sandbox checklist

Use sandbox/test keys locally (the API refuses live keys unless `NODE_ENV=production`, and test keys in production). Routing: **AUD orders → Square or PayPal; other currencies → Stripe or PayPal.** After changing `.env`, restart the API.

Square and PayPal webhooks need a public HTTPS URL. Locally, expose the API with a tunnel (for example `ngrok http 3000`) and use `https://<your-tunnel>/api/webhooks/<provider>`.

### Stripe (non-AUD orders)

1. In the Stripe Dashboard (test mode), copy the keys into `STRIPE_SECRET_KEY` (`sk_test_…`) and `STRIPE_PUBLISHABLE_KEY` (`pk_test_…`).
2. Forward webhooks with the Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Put the printed `whsec_…` secret in `STRIPE_WEBHOOK_SECRET` and restart the API.
3. Check out in USD (or another non-AUD currency) and pay with:
   - `4242 4242 4242 4242`: succeeds
   - `4000 0000 0000 0002`: declined
   - `4000 0025 0000 3155`: asks for 3D Secure
   Use any future expiry date and any 3-digit CVC. The order should move to **Being prepared** once the `payment_intent.succeeded` webhook arrives (watch the `stripe listen` output).
4. Refund from admin; the `refund.updated` webhook confirms it.

### Square (AUD orders)

1. In the Square Developer Console, open your app and switch to **Sandbox**. Copy the sandbox access token (`SQUARE_ACCESS_TOKEN`), application ID (`sandbox-sq0idb-…`, `SQUARE_APPLICATION_ID`) and a location ID (`SQUARE_LOCATION_ID`). Keep `SQUARE_ENVIRONMENT=sandbox`.
2. Under **Webhooks**, add a subscription with the URL `https://<your-tunnel>/api/webhooks/square` and the events `payment.created`, `payment.updated`, `refund.created`, `refund.updated` and `dispute.created`. Copy its signature key into `SQUARE_WEBHOOK_SIGNATURE_KEY`, and put **exactly the same URL** in `SQUARE_WEBHOOK_URL`, because the URL is part of the signature.
3. Check out in AUD and pay with card `4111 1111 1111 1111`, CVV `111` and any future expiry date. To test failures, use CVV `911` (CVV rejected), postal code `99999`, expiry `01/40`, or card `4000 0000 0000 0002` (declined).
4. Refund from admin; Square's `refund.updated` webhook completes it.

### PayPal (all currencies)

1. At developer.paypal.com → **Apps & Credentials** (Sandbox), create an app and copy its client ID and secret (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`). Keep `PAYPAL_ENVIRONMENT=sandbox`.
2. In the app's **Webhooks** section, add `https://<your-tunnel>/api/webhooks/paypal` with the events `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `PAYMENT.REFUND.PENDING` and `PAYMENT.REFUND.FAILED`. Copy the webhook ID into `PAYPAL_WEBHOOK_ID`.
3. Under **Sandbox accounts**, use the default *personal* (buyer) account to log in at the PayPal popup and approve the payment. The API captures it on the server.

### What to check each time

- The order shows **Being prepared**, the bag is empty, and the admin order shows the payment with its provider ID.
- Paying the same order twice (for example in two tabs) refunds the second payment automatically and flags the order in admin (**Needs attention**).
- Partial and full refunds from admin appear in the order history; a full refund marks the order **Refunded**.
- Redelivering a webhook from the provider's dashboard changes nothing.
