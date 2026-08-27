# Aurora Storefront

The customer-facing shop for the [ecommerce-api](../ecommerce-api) Laravel backend. Next.js 16 (App Router), React 19, Tailwind 4, TypeScript.

## Running it

Three things need to be up, in this order.

**1. MySQL** — start it from the XAMPP Control Panel.

**2. The API**, from `ecommerce-api/`:

```bash
C:\xampp\php\php.exe artisan serve
```

**3. A queue worker**, so order and password emails actually send. Also from `ecommerce-api/`:

```bash
C:\xampp\php\php.exe artisan queue:work
```

**4. This app**, from `ecommerce-storefront/`:

```bash
npm run dev
```

Then open http://localhost:3000.

With `MAIL_MAILER=log`, emails land in `ecommerce-api/storage/logs/laravel.log` rather than being sent.

## Sign-in details

Seeded by `php artisan db:seed`:

| Account | Password |
|---|---|
| `john@example.com` | `password123` |
| `tom@example.com` | `password123` |
| `mark@example.com` | `password123` |
| `admin@example.com` (admin panel) | `password123` |

## Environment

`.env.local`, copied from `.env.example`:

| Variable | Purpose |
|---|---|
| `API_URL` | Where the Laravel API lives. **Server-side only** — deliberately not `NEXT_PUBLIC_`, so the browser never learns the API host and cannot call it directly. |
| `NEXT_PUBLIC_SITE_URL` | This site's public origin, used for canonical URLs and the sitemap. |

## How it is put together

**The API is the only authority on money and stock.** The storefront never computes a total, a tax figure, or a shipping fee. Checkout quotes `GET /api/cart/totals`, which runs the API's own `PricingService`. A client-side estimate would eventually disagree with what the customer is charged.

**The Sanctum token lives in an httpOnly cookie** and never reaches client JavaScript. `src/lib/api.ts` imports `server-only`, so importing it from a Client Component fails the build rather than leaking the API host or a token to the browser. Client components mutate through Server Actions.

**Guest carts hold ids and quantities, never prices.** A tampered cookie can change what is in the basket; it can never change what it costs. Signing in merges the guest cart into the server cart, tolerantly — anything that sold out meanwhile is reported rather than failing the whole basket.

**Catalog filter state lives entirely in the URL**, which makes every filtered view shareable, bookmarkable, correct under the back button, and server-renderable.

**Forms work without JavaScript.** Sign-in, registration, password reset, checkout, payment and order cancellation are all progressively enhanced Server Action forms. The verification scripts submit them exactly as a browser with scripting disabled would, which is both how they are tested and proof that they degrade.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run verify` | Every verification suite below, in order |

### Verification

There is no unit-test framework here. Instead each suite drives the running app over HTTP and asserts against real responses — server-rendered HTML, JSON payloads, cookies and redirects. **The API and this app must both be running.**

| Command | Covers |
|---|---|
| `npm run verify:contract` | The API's live responses match `src/types/api.ts` |
| `npm run verify:catalog` | Sorting, filters, facets, pagination, malformed input |
| `npm run verify:product` | Metadata, JSON-LD, stock states, 404s |
| `npm run verify:cart` | Totals, stock limits, tampered cookies |
| `npm run verify:auth` | Route guard, cookie flags, merge-on-login, open-redirect refusal |
| `npm run verify:checkout` | A complete purchase, plus idempotency |
| `npm run verify:account` | Order history, timeline, cancellation, stock restoration |

Some suites create orders and consume stock. They clean up their carts, but seeded stock does drift over repeated runs — `php artisan migrate:fresh --seed` in the API resets it.

## Structure

```
src/
├── app/
│   ├── actions/       Server Actions (cart, auth, checkout)
│   ├── api/           Route handlers (cart snapshot for the drawer)
│   ├── account/       Order history and detail
│   ├── checkout/      Checkout, payment, confirmation
│   ├── products/      Catalog and product detail
│   └── ...            Auth screens, cart, sitemap, robots
├── components/        UI, catalog, cart, checkout, orders, auth, layout
├── hooks/             use-filters
├── lib/               api, catalog, cart, orders, auth, session, filters
├── types/api.ts       The API contract
└── proxy.ts           Route guard (Next 16's renamed middleware)
```

## Things worth knowing

**Payments are a mock gateway.** No card details are collected and no money moves. The flow around it — intent, capture, signed webhook, idempotency — is real, and swapping in a live provider means writing one class against the API's `PaymentGateway` contract.

**Unknown product URLs are a soft 404.** They render the right page but answer `200`, because Partial Prerendering commits the status before the lookup resolves and it cannot change mid-stream. `proxy.ts` sets `X-Robots-Tag: noindex` on those responses so they are never indexed. See `STOREFRONT_PLAN.md` for the full reasoning.

**Product images fall back to a letter.** Seeded products have no image; upload real ones through the admin panel and they appear.
