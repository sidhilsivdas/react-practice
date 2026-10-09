## What the JD says

> "integration with **headless, API-driven e-commerce platforms**" · "contribute to backend development… particularly around **Node.js services, API integration**"

---

## What it means

**Traditional ("monolithic") e-commerce:** the shop platform (Magento, older SAP Hybris, Salesforce SiteGenesis) renders the website **and** manages products, carts and orders, all in one system with its own templates.

**Headless e-commerce:** the commerce platform has **no front end ("no head")**. It only exposes **APIs**. Your team builds the storefront separately (React/Next.js) and calls those APIs.

```
Monolithic                         Headless
┌─────────────────────┐            ┌───────────────┐   APIs   ┌───────────────────┐
│ Commerce platform   │            │  Next.js      │ ───────▶ │ Commerce engine   │ products, cart, orders
│  ├ templates (UI)   │            │  storefront   │ ───────▶ │ CMS               │ content, banners
│  ├ products, cart   │            │  (your team)  │ ───────▶ │ Search            │ search, facets
│  └ orders, payments │            └───────────────┘ ───────▶ │ Payments, reviews │
└─────────────────────┘                                       └───────────────────┘
```

**"Composable commerce" / MACH** = **M**icroservices, **A**PI-first, **C**loud-native, **H**eadless: pick the best service for each job (commerce, CMS, search, payments) and compose them.

| Why companies go headless | The cost |
|---|---|
| Fast, modern front end (Next.js, Core Web Vitals) | You build and run the front end yourself |
| Same APIs serve web, app, kiosk, marketplace | More integrations to manage |
| Front-end and back-end teams release independently | Need strong API contracts and monitoring |
| Swap vendors (search, CMS) without rewriting everything | Data from many sources needs aggregating |

---

## Common platforms

| Type | Examples |
|---|---|
| **Commerce engines** | **commercetools**, **Shopify** (Storefront API / Hydrogen), **BigCommerce**, **Salesforce Commerce Cloud** (Composable Storefront / PWA Kit), **SAP Commerce Cloud** (Composable Storefront), **Adobe Commerce** (headless GraphQL), Elastic Path, Medusa, Saleor |
| **CMS** | Contentful, Sanity, Storyblok, Contentstack, Amplience, Adobe Experience Manager |
| **Search** | Algolia, Constructor, Bloomreach, Elasticsearch/OpenSearch |
| **Payments** | Stripe, Adyen, PayPal, Checkout.com |
| **Others** | Reviews (Bazaarvoice), tax (Avalara), personalisation, analytics, consent management |

**Accenture works with most of these** (large SAP, Salesforce, Adobe and commercetools practices), so expect "have you integrated with X?" Know the **concepts**, which transfer: products and variants, prices, inventory, carts, checkout, orders, customers.

---

## What they expect

1. **Clean integration layer:** components never depend directly on a vendor's data shapes.
2. **BFF / aggregation:** combine several APIs into exactly what each page needs.
3. **Caching & invalidation:** fast pages without stale prices.
4. **Resilience:** the page still works when one service (reviews, recommendations) is down.
5. **Security:** API keys stay on the server, and the checkout is safe.
6. **Webhooks:** react to changes in products, prices and orders.
7. **Contract-first collaboration** with backend teams (OpenAPI/GraphQL schemas, mocks).

---

## Integration layer

**Wrap each vendor behind your own interface** (the adapter pattern / anti-corruption layer):

```ts
// shared/commerce/types.ts: YOUR domain model, used by all UI
export type Product = {
  id: string; slug: string; name: string
  price: { amount: number; currency: string }
  images: { url: string; alt: string; width: number; height: number }[]
  inStock: boolean
}

export interface CommerceProvider {
  getProduct(slug: string, locale: string): Promise<Product | null>
  searchProducts(query: SearchQuery): Promise<SearchResult>
  getCart(cartId: string): Promise<Cart>
  addToCart(cartId: string, item: CartItemInput): Promise<Cart>
}
```

```ts
// shared/commerce/commercetools.ts: ONE file knows the vendor's shapes
export const commercetoolsProvider: CommerceProvider = {
  async getProduct(slug, locale) {
    const res = await ctFetch(`/product-projections?where=slug(${locale}="${encodeURIComponent(slug)}")`)
    const raw = res.results[0]
    return raw ? mapProduct(raw, locale) : null       // vendor shape → your Product
  },
  // ...
}
```

**Benefits:**

- **Switching or adding a vendor only changes the adapter.**
- **Tests can use a fake provider.**
- **UI types stay simple and stable.**

---

## BFF (backend-for-frontend)

**A BFF is a server layer built for one front end.** It aggregates, transforms and caches data, and hides secrets.

```
Browser ──▶ BFF (Next.js route handlers / server components, or a Node/Fastify service)
              ├──▶ Commerce API   (product)
              ├──▶ CMS            (marketing content for the product)
              ├──▶ Reviews API    (rating)
              └──▶ Inventory API  (stock)
           ◀── one response shaped for the product page
```

| Option | When |
|---|---|
| **Next.js server components / route handlers as the BFF** | Most storefronts: fewer moving parts, data fetched where it's rendered |
| **A separate Node.js/Fastify BFF** | Several clients (web + mobile app) need the same aggregated API, heavy logic, separate scaling or team ownership |
| **GraphQL gateway / federation** | Many backend domains, and clients want flexible queries |

**Aggregating in parallel, and surviving partial failures:**

```ts
export async function getProductPageData(slug: string, locale: string) {
  const product = await commerce.getProduct(slug, locale)
  if (!product) return null

  const [content, reviews, stock] = await Promise.allSettled([      // parallel, not one after another
    cms.getProductContent(product.id, locale),
    withTimeout(reviewsApi.getSummary(product.id), 800),           // don't let a slow service block the page
    inventory.getStock(product.id),
  ])

  return {
    product,
    content: content.status === 'fulfilled' ? content.value : null,  // optional sections degrade gracefully
    reviews: reviews.status === 'fulfilled' ? reviews.value : null,
    stock: stock.status === 'fulfilled' ? stock.value : { status: 'unknown' },
  }
}
```

---

## Caching & freshness

| Data | Freshness need | Strategy |
|---|---|---|
| Product content, images, descriptions | minutes–hours | cached + tag invalidation via webhook |
| Category listings | minutes | cached per category; filters in the URL |
| **Price** | must be correct at checkout | cached briefly on pages, **always re-validated by the cart/checkout API** |
| **Stock** | near real-time | dynamic (Suspense) or a short cache; final check at checkout |
| Cart, customer, orders | exact | never shared-cached (`no-store`), per user |
| CMS content | minutes | cached + CMS webhook revalidation |

**Rule:** cached data is for **display**. **The server re-checks price and stock** when adding to the cart and at checkout. Never trust prices sent from the browser.

---

## Cart & checkout

- **Cart ID in an HttpOnly cookie.** The cart itself lives in the commerce platform (so it survives devices and refreshes).
- **Guest cart → merge** into the customer's cart on login.
- **Optimistic UI** for add-to-cart (`useOptimistic`), with rollback on error.
- **Idempotency keys** on order creation and payment, so a double-click or retry doesn't create two orders.
- **Payments:** hosted fields or the provider's drop-in UI (Stripe/Adyen), so card data never touches your servers (simpler PCI DSS compliance). Handle 3-D Secure redirects.
- **Webhooks** from the payment provider confirm payment. Never rely only on the browser redirect.

---

## Webhooks

```ts
// app/api/webhooks/commerce/route.ts
import crypto from 'node:crypto'
import { revalidateTag } from 'next/cache'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-signature') ?? ''
  const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!).update(body).digest('hex')

  // constant-time comparison, so attackers can't guess the signature
  if (signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body)
  if (event.type === 'product.updated') revalidateTag(`product:${event.slug}`, 'max')
  return Response.json({ received: true })
}
```

**Also make handlers idempotent** (the same event can arrive twice), and respond fast (do heavy work in a queue).

---

## SEO & migration

- **Server-rendered HTML** for products and categories, `generateMetadata`, **Product structured data** (JSON-LD with price and availability), canonical URLs (filters shouldn't create thousands of indexable duplicates), sitemaps.
- **Migrating from a monolith?** Keep URLs or add **301 redirects**. Broken URLs and client-only rendering are the most common causes of lost traffic.
- **Migrate gradually** (the strangler pattern): route `/products/*` to the new storefront first, keep the rest on the old platform.

---

## What to learn

- ✅ **Headless vs monolithic**, composable commerce, MACH.
- ✅ **Core commerce concepts:** product, variant/SKU, price, inventory, cart, checkout, order, customer, promotion.
- ✅ **One platform's API in depth** (commercetools or Shopify Storefront API are great to practise), REST and GraphQL.
- ✅ **The BFF pattern**, aggregation with `Promise.allSettled`, timeouts, graceful degradation.
- ✅ **The adapter / anti-corruption layer** with typed domain models.
- ✅ **Caching per data type**, webhook-driven invalidation, signature verification.
- ✅ **Checkout security:** server-side price checks, idempotency, payment providers, PCI basics.
- ✅ **Commerce SEO:** structured data, canonicals, redirects.

---

## Interview questions

**Q: What is headless commerce?**
The commerce platform only provides APIs; the storefront is a separate application (like Next.js) that consumes them, so front and back end evolve and scale independently.

**Q: Why use a BFF?**
To aggregate several APIs into page-shaped responses, hide secrets, cache, and shield the UI from vendor changes. In Next.js, server components and route handlers often act as the BFF.

**Q: How do you keep prices and stock accurate if pages are cached?**
Cache for display with webhook invalidation, render stock dynamically or with short caching, and always re-validate price and stock on the server when adding to the cart and at checkout.

**Q: How do you handle a slow or failing service, like reviews?**
Parallel calls with timeouts, `Promise.allSettled`, and optional sections that hide or show a fallback, plus Suspense so the rest of the page isn't blocked.

**Q: How would you switch commerce vendors?**
Keep vendor details in an adapter behind your own interface and domain types, so only the adapter and mappings change.

---

## 🎯 Interview answer

> "In headless commerce the platform, say commercetools, Shopify or SAP, only exposes APIs, and our Next.js storefront consumes them alongside a CMS, search and payments. I put a clean integration layer between the UI and vendors: typed domain models like Product and Cart, and an adapter per vendor that maps its responses, so components never depend on vendor shapes and switching or mocking a provider is easy. Server components and route handlers act as the BFF, aggregating calls in parallel with timeouts and `Promise.allSettled`, so a failing reviews service only hides one section; if mobile apps need the same aggregation, I'd extract it into a Node or Fastify service. Caching depends on the data: product and CMS content are cached with tags and invalidated by signed webhooks, stock is dynamic or briefly cached, and cart, customer and checkout are never shared-cached. Prices and stock are always re-checked on the server at add-to-cart and checkout, orders use idempotency keys, and payments go through the provider's hosted fields with webhook confirmation. On top of that: server-rendered pages with structured data and canonicals for SEO, and 301 redirects when migrating from a monolith."
