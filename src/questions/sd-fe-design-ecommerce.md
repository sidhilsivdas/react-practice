## The question

> "**Design the frontend of a headless e-commerce storefront**: product listing with filters, product detail page, cart and checkout. It must be fast, SEO-friendly and accessible, and serve 2 million visits a day with sale-day peaks."

**This combines everything in this section.** Below is a model answer using **RADIO** ([framework](#/q/sd-fe-interview-framework)). In the interview, talk through it and draw the diagrams.

---

## Requirements

**Clarifying questions → agreed answers:**

| Question | Assumed answer |
|---|---|
| Users and devices? | 70% mobile, many on mid-range Android with 4G |
| Markets? | UK + EU: 3 languages, GBP/EUR → i18n, currency, the **EAA** (accessibility law) |
| Catalogue size? | ~50k products, ~500 categories, prices updated daily, stock changes often |
| Commerce platform? | Headless (e.g. commercetools) + CMS (Contentful) + search (Algolia) + Stripe/Adyen |
| Logged-in features? | Accounts, order history; guest checkout allowed |
| SEO? | Critical for category and product pages |
| Targets? | **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1** (p75, mobile); **WCAG 2.2 AA**; 99.9% availability |

**In scope:** PLP (listing + filters), PDP (detail), cart, checkout. **Out of scope** (mention briefly): account pages, CMS editing, the admin back office.

---

## Architecture

```
                         ┌──────────────────────────────────────────────┐
 Browser ──▶ CDN / Edge ─┤ static assets (immutable), cached HTML,       │
 (mobile)                │ image CDN (AVIF/WebP resizing)                │
                         └───────────────────────┬──────────────────────┘
                                                 ▼
                         ┌──────────────────────────────────────────────┐
                         │ Next.js 16 app (Node, autoscaled containers) │
                         │  proxy.ts: locale redirect, A/B bucket,      │
                         │            auth cookie check                 │
                         │  Server components + "use cache" (PLP, PDP)  │
                         │  Server Actions: cart, checkout steps        │
                         │  Route handlers: webhooks, /api/vitals       │
                         └──┬────────────┬────────────┬───────────┬─────┘
                            ▼            ▼            ▼           ▼
                    Commerce API     Search API     CMS API    Payments
                    (cart, orders,   (listing,      (banners,  (hosted fields,
                     prices, stock)   facets)        content)   webhooks)
                            ▲
           Fastify BFF (optional): shared aggregation for web + mobile app, Redis cache
```

**Key decisions (with trade-offs):**

1. **Next.js App Router with server components by default.** Little client JavaScript (good INP), server-rendered HTML for SEO and LCP. Trade-off: the server/client boundary needs discipline.
2. **Rendering per page**, cached with tags and invalidated by webhooks; dynamic only where data is personal or must be exact.
3. **Integration layer** (adapters + domain types) so vendors can be swapped; a separate Fastify BFF only if mobile apps need the same aggregation.
4. **CDN in front of everything**, plus an image CDN, so sale-day peaks hit the cache, not the origin.

---

## Pages & rendering

| Page | Rendering | Caching / freshness |
|---|---|---|
| **PLP** `/[locale]/c/[category]?color=black&size=42&sort=price` | Server component; filters read from `searchParams` | Unfiltered category pages cached (`cacheTag('category:shoes')`); filtered combinations dynamic or briefly cached; **canonical** points to the unfiltered page |
| **PDP** `/[locale]/p/[slug]` | Server component: static shell + `<Suspense>` holes | Product data cached by tag, invalidated by a **product.updated webhook**; **price/stock** streamed dynamically; reviews streamed |
| **Cart** `/[locale]/cart` | Dynamic, per user | No shared cache; cart ID in an HttpOnly cookie |
| **Checkout** | Dynamic, client-heavy forms | No cache; idempotent order creation |

```
PDP component tree
ProductPage (server, cached data)
├── Breadcrumbs (server)
├── Gallery (client: zoom, swipe; first image server-rendered with priority)
├── ProductInfo (server: name, description, cached price for display)
├── <Suspense fallback={<PriceStockSkeleton/>}> LivePriceStock (server, dynamic) </Suspense>
├── VariantPicker (client, URL state ?size=42)
├── AddToCartButton (client: Server Action + useOptimistic)
├── <Suspense> Reviews (server, timeout + fallback) </Suspense>
└── <Suspense> Recommendations (server, personalised) </Suspense>
```

---

## Data model & state

```ts
type Money = { amount: number; currency: 'GBP' | 'EUR' }
type Product = { id: string; slug: string; name: string; description: string
                 images: Image[]; variants: Variant[]; priceRange: { min: Money; max: Money } }
type Variant = { sku: string; attributes: { size?: string; color?: string }; price: Money; inStock: boolean }
type Cart = { id: string; lines: { sku: string; qty: number; unitPrice: Money }[]; subtotal: Money; currency: string }
type ListingQuery = { category: string; filters: Record<string, string[]>; sort: string; cursor?: string }
```

| State | Lives in |
|---|---|
| Products, categories, content | Server (cached) |
| Filters, sort, pagination, selected variant | **URL** (shareable, SEO, back button) |
| Cart | Commerce platform (server) + the cart ID cookie; client cache for the header badge |
| Checkout form | Local form state (React Hook Form / form actions) + saved per step on the server |
| Session / user | HttpOnly cookie, read on the server |
| UI (drawers, menus) | Local component state |

---

## API interfaces

```http
GET  /search?category=shoes&filters=color:black,size:42&sort=price_asc&cursor=xyz&limit=24&locale=en-GB
→ { items: ProductSummary[], total: 312, nextCursor: "abc",
    facets: [{ name: "color", values: [{ value: "black", count: 40 }] }] }

GET  /products/:slug?locale=en-GB             → Product        (cache: tag product:<slug>)
GET  /products/:id/availability               → { sku, price, inStock }[]   (no-store)

POST /cart/lines           { sku, qty }       → Cart   (server re-checks price + stock; 409 if out of stock)
PATCH /cart/lines/:sku     { qty }            → Cart
POST /checkout/orders      { cartId, ... }    Idempotency-Key: <uuid>  → { orderId }
POST /webhooks/commerce    (signed)           → revalidateTag(...)
```

- **Cursor pagination** keeps results stable as the catalogue changes.
- **Errors** in a Problem Details format.
- **Server Actions** call these from the Next.js server, so the browser never sees API keys.

---

## Optimisations

### Performance (Core Web Vitals)

- **LCP:**
  - Cached HTML at the CDN (low TTFB).
  - PDP hero image with `next/image` `priority` and correct `sizes` (AVIF/WebP).
  - `next/font`.
  - Third-party tags deferred.
- **INP:**
  - Server components (minimal JavaScript).
  - Filters update with `useTransition`.
  - Gallery and zoom code-split with `next/dynamic`.
  - Long lists paginated (or virtualised on mobile infinite scroll).
  - Tag manager audit.
- **CLS:**
  - Image dimensions everywhere.
  - Reserved space for banners and badges.
  - Skeletons matching the final layout.
- **Budgets:** Lighthouse CI + size-limit in the pipeline, and RUM dashboards with alerts.

### Scalability & resilience (sale days)

- **CDN absorbs read traffic.** Use `stale-while-revalidate`, so a webhook storm doesn't overload the origin.
- **Autoscaled Next.js containers**, a shared ISR cache handler (Redis), and load tests (k6) before sales.
- **Timeouts plus `Promise.allSettled`** for optional services (reviews, recommendations), so they degrade gracefully.
- **Queue or waiting room** for extreme checkout peaks, and rate limiting on cart and checkout APIs.

### Accessibility (WCAG 2.2 AA, EAA)

- **A design system built on accessible primitives.**
- **Filters** as `fieldset`/`legend` with announced result counts.
- **Variant picker** as a radio group.
- **Cart updates** announced through `role="status"`.
- **Focus-managed drawers.**
- **Checkout forms** with `autocomplete` and linked errors.
- **Testing:** axe in Playwright, plus manual screen-reader passes.

### SEO

- **Server-rendered HTML.**
- **`generateMetadata`:** titles, descriptions, `hreflang` per locale.
- **Product JSON-LD** (price, availability, rating).
- **Canonical URLs** for filter combinations.
- **XML sitemaps.**
- **301 redirects** from old URLs.

### Cart & checkout correctness

- **Optimistic add-to-cart with rollback.**
- **Server-side price and stock re-validation.**
- **Guest-to-customer cart merge on login.**
- **An idempotency key per order.**
- **Payment via hosted fields** (PCI scope reduced), with 3-D Secure and **confirmation via the payment webhook**.

### Security

- **HttpOnly, Secure, SameSite cookies.**
- **CSRF protection** (Server Actions check the origin).
- **CSP headers.**
- **No secrets in `NEXT_PUBLIC_*`.**
- **Sanitised CMS HTML.**
- **Bot and rate limiting** on login and checkout.

### i18n

- **Locale in the URL**, and the `proxy.ts` redirect by `Accept-Language`.
- **`Intl.NumberFormat`** for prices.
- **Translations loaded per locale on the server.**

### Observability & quality

- **Sentry** (errors), **RUM** (Core Web Vitals per template), **tracing** through the BFF, and business metrics (add-to-cart rate, checkout funnel).
- **Testing:**
  - Unit tests for mappers and price logic.
  - Component tests for filters and the variant picker.
  - **Playwright E2E** for browse → PDP → add to cart → checkout (with the payment sandbox), on the preview deployment of every PR.

---

## Trade-offs to mention

| Decision | Alternative | Why this choice |
|---|---|---|
| Cached PDP + dynamic price/stock holes | Full SSR per request | Static-speed LCP while still showing accurate stock |
| Filters in the URL | Client-only state | Shareable, SEO, back button; costs a server round-trip (mitigated with `useTransition` and prefetching) |
| Next.js as the BFF | A separate Fastify BFF | Fewer moving parts; extract later if mobile apps need shared aggregation |
| Monorepo with feature modules | Micro-frontends | One team today; micro-frontends add runtime cost without solving a real problem yet |
| Offset pagination | Cursor | Cursor is stable when items change; offset allows "jump to page 7" (could support both) |

---

## 🎯 Interview answer

> "After clarifying requirements (mostly mobile users, three locales, 50,000 products, SEO-critical listing and product pages, Core Web Vitals and WCAG 2.2 AA targets, and sale-day peaks), I'd build the storefront with Next.js 16 behind a CDN, talking to a headless commerce platform, CMS, search and payment provider through a typed adapter layer. Product listing pages are server components driven by URL filters, with category pages cached by tag and filtered combinations canonicalised to the main category for SEO. Product pages are a cached static shell invalidated by signed product webhooks, with price and stock streamed dynamically inside Suspense, and reviews and recommendations as independent Suspense boundaries with timeouts, so a slow service never blocks the page. The cart lives in the commerce platform behind an HttpOnly cookie, with optimistic add-to-cart via Server Actions, and every mutation re-validates price and stock on the server; checkout uses hosted payment fields, idempotency keys and webhook confirmation. For performance, I prioritise the hero image, ship minimal client JavaScript, use transitions for filters, reserve space to avoid layout shift, and enforce budgets in CI with RUM alerts. For scale, the CDN absorbs reads with stale-while-revalidate, containers autoscale with a shared cache, and we load-test before sales. Accessibility is built into the design system and tested with axe and screen readers, and Playwright covers the full purchase journey on every pull request."
