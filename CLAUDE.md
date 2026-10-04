# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Custom single-brand online store for **Malikah Bridal Studio**, a Pakistani bridal and formal wear shop based in **Australia**.

> TODO: confirm the exact brand spelling with the client ("Malikah" vs "Malaikah"). The code currently says "Malaikah". Once confirmed, use it everywhere: `src/config/brand.ts`, metadata, emails, `StoreSettings.storeName`.

Key business facts:

- **Market:** Pakistani bridal and festive wear. Customers shop for occasions like Nikah, Mehndi, Barat, Walima, Eid and formal events. Never use Indian-festival content (Diwali, Karwa Chauth, Navratri) or copy text, images or code from reference sites. KALKI Fashion, LAAM and Nameera by Farooq are **layout/UX references only**.
- **Base currency:** AUD. Prices are GST-inclusive (10% GST) for Australian orders. International (export) orders are GST-free.
- **Ships worldwide**, with shipping rates and free-shipping limits set per country/zone.
- **The owner is non-technical.** Every admin screen must be simple, with clear labels, sensible defaults and no jargon. If he can't use a feature without help, it isn't done.
- **Payments:**
  - Square, which is linked to his physical shop, for AUD orders
  - Stripe for non-AUD orders, charged in the customer's currency
  - PayPal for everyone

## Repository layout

Monorepo with no workspace tooling: two independent npm projects.

| Folder | Stack | Dev port |
|---|---|---|
| `e-commerece-frontend` | Next.js 16 (App Router, React 19), Tailwind v4 | 3001 |
| `e-commerece-backend` | NestJS 12 + Prisma 7 (Postgres) | 3000 |

Each has its own `package.json`, `node_modules`, and lint/test setup. Always `cd` into the relevant folder before running commands.

The admin panel lives **inside the frontend** under `/admin`. There is no separate admin app.

## Commands

### Frontend (`e-commerece-frontend`)

```bash
npm run dev      # next dev -p 3001
npm run build
npm run start    # next start -p 3001
npm run lint     # eslint
```

No test runner is configured yet.

### Backend (`e-commerece-backend`)

```bash
npm run start:dev    # nest start --watch
npm run build        # nest build
npm run lint         # oxlint src/ test/
npm run format       # prettier --write src/**/*.ts test/**/*.ts

npm run test         # vitest run (unit, *.spec.ts)
npm run test:watch
npm run test:cov
npm run test:e2e     # *.e2e-spec.ts against <db>_test (auto-created, migrated, seeded)

# single test file
npx vitest run src/path/to/file.spec.ts
```

Prisma (schema at `prisma/schema.prisma`, generator output `src/generated/prisma`, which is gitignored and must be regenerated after install or schema changes):

```bash
npx prisma generate
npx prisma migrate dev --name <describe_change>
npx prisma studio
```

The backend's `.claude/skills` directory has Prisma 7 skills (`prisma-cli`, `prisma-client-api`, `prisma-orm-setup`, `prisma-driver-adapter-implementation`, etc.). Prefer them over general Prisma knowledge: this project uses Prisma 7 with the driver-adapter API (`@prisma/adapter-pg`), not the legacy pattern.

## Golden rules (apply to every task)

1. **Money is always an integer in cents.** Never use floats for money. Never store or pass formatted strings like `"$219"`.
   - Product, variant, shipping and coupon amounts are stored in **AUD cents, GST-inclusive**.
   - Every money value that crosses the API is `{ amount: number, currencyCode: string }`.
   - The frontend formats money in **one helper only** (`formatMoney`). Components never format prices themselves.
2. **The server is the source of truth for prices.** The cart lives in the database, keyed by a cookie token. Never trust a price, total, discount or shipping amount sent by the browser. Always recalculate on the server.
3. **One pricing service.** Currency conversion, coupons, shipping, GST and totals are calculated in a single backend `PricingService`. Cart and checkout both use it. Never duplicate pricing logic.
4. **Orders are snapshots.** When an order is created, copy product name, SKU, size, colour, image, unit price and address into the order. Never read live product data to display a past order.
5. **Stock changes happen in a transaction**, together with order creation. Never let stock go below zero.
6. **Payment webhooks are idempotent.** The same webhook delivered twice must not change anything the second time. Look up `Payment.providerPaymentId` first.
7. **Secrets only in `.env`.** Never hardcode API keys, and never commit `.env`. Add every new variable to `.env.example` with a placeholder.
8. **Schema changes go through migrations** (`prisma migrate dev`). Never edit the database by hand. Never use `db push` outside throwaway experiments.
9. **Original content only.** Never copy text, images, product data or code from KALKI or any other reference site.

## Domain model (see `prisma/schema.prisma`)

### Catalog

- **Product** has many **ProductVariant** rows (one per size × colour, each with its own SKU and stock) and many **ProductImage** rows. `Product.price` is the default price; `ProductVariant.price` overrides it when set. `compareAtPrice` set means "on sale".
- Extra product fields:
  - `badge` for card labels like "New This Week"
  - `tags` for search and smart rules
  - `deliveryDays` for made-to-order items
  - `salesCount` for "Best selling" sort; increment it only when an order is paid
- **SizeGuide** is shared across products.

### Category vs Collection

These are **different** concepts. Don't merge them.

- **Category** is what a product *is*. Each product has exactly one. It's a tree (e.g. Suits → Sharara) used for breadcrumbs, the category filter and Google product data.
- **Collection** is how products are *grouped* for shoppers. A product can be in many. URL: `/collections/[slug]`.
  - `MANUAL` collections use the `CollectionProduct` join table, sorted by `sortOrder`.
  - `SMART` collections use `CollectionRule` rows, combined with AND when `matchAllRules` is true and OR when it is false. Smart collections are **calculated at query time**, never stored as product lists.
  - There must be **exactly one function** that converts a collection's rules into a Prisma `where` filter (in the collections module). Collection pages, filter counts, sitemaps and the Meta feed all reuse it.

### Filters

`Attribute` → `AttributeValue` → `ProductAttributeValue`. These power filters like Fabric, Work, Occasion and Print. The owner creates new attributes from admin, so never hardcode filter types. Size and colour come from variants. `Collection.filterAttributeIds` limits which filters a collection page shows; empty means all filterable attributes.

### Content and navigation

- **Page** with ordered **PageSection** rows. Section types:
  - `RICH_TEXT`, `HERO_BANNER`, `IMAGE_WITH_TEXT`, `FAQ`
  - `COLLECTION_GRID` and `PRODUCT_CAROUSEL` (products from one collection)
  - `COLLECTION_TILES` (several collections as image tiles)
- The **homepage is the Page with slug `home`**. It is rendered from its sections, not hardcoded.
- **Menu** (`main`, `footer`) with a **MenuItem** tree. Item types are `COLLECTION`, `CATEGORY`, `PAGE`, `URL` and `HEADING`; `HEADING` is a group title in the mega menu.
- **Banner**, **Faq**, and **StoreSettings** (a single row with `id = 1`: WhatsApp number, social links, announcement bar, Meta Pixel ID, GA ID, GST rate).

### Currency

`Currency` holds `rateFromAud` (set by the owner) and `roundTo` (e.g. 100 = round up to whole units). The conversion is `ceil(audCents × rate / roundTo) × roundTo`. It lives only in `PricingService`. Every order stores `currencyCode` and the `exchangeRate` used, plus `totalAud` for reporting.

### Shipping and tax

`ShippingZone` (a list of ISO country codes, `isFallback` for rest of world, `chargesGst`) has many `ShippingRate` rows (price in AUD cents and an optional `freeOverAmount`). Since prices are GST-inclusive, the GST shown is the included portion: `total × 10 / 110` for GST zones, and 0 elsewhere.

### Orders and payments

Order statuses:

```
PENDING_PAYMENT → PROCESSING → SHIPPED → DELIVERED
                  (also CANCELLED, REFUNDED)
```

Every status change writes an `OrderStatusChange` row. `Payment.provider` is one of `SQUARE`, `STRIPE` or `PAYPAL`.

Payment routing rule:

- `currencyCode === "AUD"` → Square card form
- any other currency → Stripe, charged in that currency
- PayPal is offered for every currency

## Backend architecture (`e-commerece-backend`)

### Existing setup

- `AppModule` wires `ConfigModule` (global, reads `.env`) and the global `PrismaModule`.
- `PrismaService` extends the generated `PrismaClient` with the `PrismaPg` adapter, using `DATABASE_URL` via `ConfigService.getOrThrow`.
- `PrismaModule` is `@Global()`.
- All routes are under the global `/api` prefix; `GET /api/health` runs `SELECT 1`.
- `main.ts` also registers cookie-parser, the global `ValidationPipe` and `AllExceptionsFilter` (`src/common/filters`). Env vars are validated at startup in `src/config/env.validation.ts`; add new required vars there and to `.env.example`.
- `AdminGuard` is a global guard: every controller whose path starts with `admin` is protected automatically. Mark the rare public admin handler (e.g. login) with `@Public()`.
- Seed with `npx prisma db seed` (`prisma/seed.ts`, run via tsx). Keep it re-runnable: upserts with `update: {}`.
- `configureApp()` (`src/app.setup.ts`) holds prefix/pipes/filter/cookies; `main.ts` and e2e tests both use it. E2E tests use `test/helpers/app.ts` (`createTestApp`, `loginAsAdmin`).
- Currency: `CurrencyService.resolve(code)` → `CurrencyContext` (`convert`, `toAudBounds`). All maths is integer (BigInt) in `pricing/currency-math.ts`; AUD is never rounded. Public price endpoints take `?currency=`.
- Slugs: `common/slug` `resolveSlug()` for every entity (auto `-2`, `-3`; explicit slug that is taken → 409). Slugs don't change when a name changes.
- Category tree: `CategoriesService.loadIndex()` loads the (small) table once for descendants, breadcrumbs and cycle checks. Never walk the tree with per-level queries.
- Product cards: `PRODUCT_CARD_SELECT` + `toProductCard()` (`catalog/products/product-card.ts`). "Available" variant = `isActive && stock > 0` (`AVAILABLE_VARIANT`), used by card sizes and size/colour filters.
- Collections: `buildCollectionWhere()` (`collections/collection-rules.ts`) is the only rules → `where` function; `buildFilterWhere(filters, exclude?)` builds storefront filters, and facet counts exclude their own group. Sorting, PRICE rules and price filters use `Product.price` (variant overrides apply only on the product page).
- Tags are stored lowercase. Deleting a category/attribute value also deletes smart rules that point at it. Products/variants with order history are archived/deactivated, never deleted.
- Listings: `ListingService` (`collections/listing.service.ts`) does cards, sorting, filters and facets for **both** collection pages and category pages (`GET /api/categories/:slug`). Don't build a second listing.
- Pages: `GET /api/pages/:slug` (home = `home`, which can't be deleted, renamed or unpublished). Product sections are resolved with one id-only query per distinct collection (max 12 product sections per page) plus one batched card query; never query per section. `validateSection()` holds the per-type rules.
- Rich text: every admin HTML field uses the `@SanitizeHtml()` DTO decorator (`common/html/sanitize-html.ts`, allow-list). Add it to any new HTML field. Links use `@IsSafeLink()`, image URLs `@IsImageUrl()` (`common/validation.ts`).
- Uploads: `POST /api/admin/uploads` (multipart field `files`). sharp checks the real type, auto-rotates, strips EXIF/GPS, fits 2400px, saves WebP. Storage is `StorageService` with `local` (served at `/uploads`) or `s3` (S3/R2) drivers, picked by `STORAGE_DRIVER`.
- Redirects: when a product, collection, category or page slug changes, call `RedirectsService.recordSlugChange(tx, …)` **inside the same transaction**. `planRedirect()` keeps the table free of chains and loops. The storefront calls `GET /api/redirects/resolve?path=` on a 404.
- Cache refresh: after every admin change, call `RevalidationService.notify([...tags])` (fire-and-forget, never awaited, never fails the request) with the tags in the table below.
- `main.ts` enables CORS for `FRONTEND_URL` (comma-separated list) with `credentials: true`.
- ESM project (`"type": "module"`): imports use explicit `.js` extensions even in `.ts` files. Follow this for every new file.
- The test runner is Vitest (not Jest), and linting is oxlint (not ESLint).

### Planned modules

Each module lives in `src/modules/<name>/`:

| Module | Responsibility |
|---|---|
| `auth` | Admin login and customer login (JWT in an httpOnly cookie). Separate guards: `AdminGuard`, `CustomerGuard`. |
| `catalog` | Categories, products, variants, images, size guides, attributes |
| `collections` | Collections, smart-rule → `where` builder, filter counts |
| `cart` | Server-side cart, cookie token, add/update/remove, apply coupon |
| `pricing` | Currency conversion, coupons, shipping, GST, totals. Only controller: public read-only `GET /api/currencies` |
| `checkout` | Validates the cart, creates the order, reserves stock |
| `orders` | Customer order history, admin order list, status updates, tracking |
| `payments` | `PaymentProvider` interface with `square`, `stripe` and `paypal` adapters, plus webhook controllers |
| `shipping` | Zones and rates; finds the zone for a country code |
| `content` | Pages, sections, menus, banners, FAQ, store settings |
| `uploads` | Image upload (sharp → WebP) to local disk or S3/R2; returns `{ url, width, height }` |
| `redirects` | Old-slug redirects (automatic on slug change + admin CRUD), `resolve` for the storefront |
| `revalidation` | Tells the Next.js storefront which cache tags to refresh after admin changes |
| `mail` | Order confirmation and shipped emails |
| `feeds` | `sitemap.xml`, Meta product feed |

### Conventions

- **Routes:** public routes are under `/api/...`. Admin routes are under `/api/admin/...` and protected by `AdminGuard`. Keep public and admin controllers in separate files (`products.controller.ts`, `products.admin.controller.ts`).
- **Validation:** validate all input with DTOs. Add `class-validator` + `class-transformer` and a global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) when building the first DTO.
- **Cookies:** add `cookie-parser` in `main.ts` when building auth or cart.
- **Thin controllers:** controllers only parse input and call services. Business logic goes in services. Prisma is used only inside services.
- **Pagination:** list endpoints return `{ items, total, page, pageSize }`.
- **Errors:** throw Nest HTTP exceptions with clear messages the frontend can show to users.
- **Tests:** every service with business logic (pricing, collection rules, checkout, webhooks) gets a Vitest spec. Pricing must have tests for currency rounding, coupons, free shipping and GST.

## Frontend architecture (`e-commerece-frontend`)

Read `AGENTS.md` first: Next.js 16 has breaking changes. Check `node_modules/next/dist/docs/` before using any Next.js API you're unsure about.

### Structure

- `src/app/` holds routes only:
  - `(shop)` is the storefront, with shared `Header`/`Footer` in `(shop)/layout.tsx`
  - `(auth)` holds login/register/forgot-password
  - `account/` and `admin/` are top-level trees
  - the root `layout.tsx` sets up fonts (Geist, Playfair Display) and the HTML shell
- `src/modules/<domain>/` holds the `api/`, `components/`, `hooks/`, `types/` and `schemas/` folders, with a barrel `index.ts` per domain.
- `src/shared/` holds presentation-only components and layouts.
- `src/infrastructure/http/api-client.ts` is the **only** place `fetch` to the backend is configured (base URL, credentials, error handling). `modules/*/api` functions build on it.
- `src/config/brand.ts` holds brand constants. `src/config/env.ts` is for typed env access; use it instead of reading `process.env` directly.
- `src/store/`: Redux Toolkit is for **UI state only** (menus, drawers, selected currency). The cart is server data fetched from the API, not a Redux copy.
- Path alias `@/*` → `src/*`. Styling is Tailwind CSS v4.

### Storefront routes

| Route | Content |
|---|---|
| `/` | Homepage, rendered from the `home` Page sections |
| `/collections/[slug]` | Banner, intro, notice, filters, sort, paginated grid, SEO text with "Read more" |
| `/categories/[slug]` | Same layout as a collection page, for a category and its sub-categories (`GET /api/categories/:slug`) |
| `/products/[slug]` | Gallery with zoom, colour/size picker, size guide, price/sale price, stock, add to cart, wishlist |
| `/pages/[slug]` | CMS pages built from sections |
| `/cart`, `/checkout`, `/account/*`, `/search` | Cart, checkout, customer account, search |

### Rules

- **Server components by default.** Collection, product and CMS pages must be server-rendered for SEO. Use client components only for interactivity (pickers, carousels, filters, cart drawer).
- **Use `next/link`** for internal links, never `<a href="#">`. **Use `next/image`** for every product and banner image, with correct `sizes`.
- **Use `generateMetadata`** on every page: title, description, canonical URL, Open Graph image.
- **Add JSON-LD:**
  - `Product` (with offers, price, currency and availability) on product pages
  - `BreadcrumbList` on product and collection pages
  - `FAQPage` on the FAQ page
  - `Organization` in the root layout
- **Prices on screen** always come from the API's `{ amount, currencyCode }` passed through `formatMoney`.
- **Mobile-first.** Most customers come from Instagram/Facebook on phones. Test every page at 375px width.
- **Use real data shapes for mock data.** While the backend isn't ready, keep mock data in `src/modules/<domain>/mock/` with the same TypeScript types the API will return, so switching to the real API changes only the data source.

### Admin panel (`/admin`)

- Has its own layout and login, protected by the admin session. Never linked from the storefront.
- **Built for a non-technical owner:**
  - large clear forms
  - drag-and-drop image upload with reordering
  - a variant generator (pick sizes and colours, and the variant rows are created automatically)
  - one-click order status buttons
  - plain-language labels ("Price shown to customers", not `compareAtPrice`)
- **Screens:**
  - Dashboard (sales today/week/month, recent orders)
  - Products
  - Categories
  - Collections (manual picker + smart rule builder)
  - Filters/Attributes
  - Orders
  - Customers
  - Coupons
  - Shipping
  - Currencies
  - Pages
  - Menus
  - Banners
  - FAQ
  - Settings

## SEO and marketing requirements

These are promised to the client, so they're not optional:

- Clean URLs, `sitemap.xml`, `robots.txt`, canonical tags, and editable SEO fields on products, collections and pages.
- AI-search friendly: structured data (above), a real FAQ page, and descriptive headings.
- Meta Pixel and Google Analytics 4. IDs come from `StoreSettings` and are loaded once in the root layout. Track `ViewContent`, `AddToCart`, `InitiateCheckout` and `Purchase`.
- A Meta product feed endpoint for Facebook/Instagram Shopping.
- A WhatsApp chat button (number from `StoreSettings`) and social links.
- Automatic emails: order confirmation and shipping update.

## Storefront cache tags

The backend POSTs `{ "tags": [...] }` to `FRONTEND_REVALIDATE_URL` with header `x-revalidate-secret: <REVALIDATE_SECRET>` after admin changes. The frontend must tag its `fetch` calls with the **same** names and call `revalidateTag()` for each tag it receives. Tag builders: `CacheTags` in `src/modules/revalidation/revalidation.service.ts`.

| Tag | Sent when | Frontend fetches that should use it |
|---|---|---|
| `product:<slug>` | product, its variants (stock/price/sizes) change; old **and** new slug on rename | product page |
| `products` | any product/variant change, attributes/filters, size guides | collection pages, category pages, search, pages with product sections, product pages |
| `collection:<slug>` | collection edited, products added/removed/reordered; old + new slug on rename | collection page, pages with a section/tile using it |
| `collections` | any collection change | anything listing collections (tiles, menus) |
| `category:<slug>` | category edited; old + new slug on rename | category page |
| `categories` | any category change or reorder | category tree, menus, breadcrumbs on product/category pages |
| `page:<slug>` | page or its sections change; old + new slug on rename | that CMS page (`page:home` = homepage) |
| `pages` | any page created/renamed/deleted | footer page links |
| `menu:<handle>` | menu items change | header (`menu:main`), footer (`menu:footer`) |
| `banners` | any banner change | banner placements |
| `faqs` | any FAQ change | FAQ page and pages with an FAQ section |
| `settings` | store settings change | root layout (announcement bar, WhatsApp, social links, Pixel/GA) |
| `redirects` | a redirect is created/changed/deleted (including on slug changes) | cached redirect lookups |

## Cross-cutting notes

- Uploaded image URLs come from `UPLOADS_PUBLIC_URL` (local) or `S3_PUBLIC_URL` (S3/R2). Add that host to `images.remotePatterns` in `next.config.ts` for `next/image`.

- Backend CORS and the frontend dev port are coupled: the backend defaults to allowing `http://localhost:3001`. Keep `FRONTEND_URL` and the frontend port in sync.
- There is no shared types package yet. Until one exists, keep frontend API types in `src/modules/<domain>/types/` matching the backend DTOs exactly, and update both sides in the same change.
- `AGENTS.md` in the frontend is rewritten by `next dev`. If it shows as changed after running dev, commit it as-is.

## Milestones

| Week | Goal |
|---|---|
| 2 | Storefront design with mock data: home, collection page, product page, cart. **Client design approval.** |
| 3–4 | Auth, catalog, collections, content, cart modules + admin screens for products, categories, collections, pages, menus |
| 5 | Pricing, checkout, orders + admin order management |
| 6 | Square, Stripe, PayPal; emails; feeds; Pixel/GA; SEO checks |
| 7 | Testing, product upload, launch |

When starting a task, check which milestone it belongs to and don't build features from later milestones unless asked.