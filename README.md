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
