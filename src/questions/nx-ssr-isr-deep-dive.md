## Quick answer

- **SSR (server-side rendering):** the server **renders HTML on every request**. The data is always fresh and can be personalised (cookies, the user, location), but every request costs server time and **TTFB depends on your slowest data**.
- **ISR (incremental static regeneration):** pages are **static (cached HTML)**, but **regenerated in the background** after a time (time-based) or when data changes (on-demand). Visitors almost always get a **fast cached page**, while content stays reasonably fresh, **without rebuilding the whole site**.
- **Real use, from published case studies:**
  - **Desenio** (art e-commerce): ISR cut full-site builds from hours to minutes.
  - **Mecum Auctions:** 275,000 lot pages generated on demand.
  - **The Washington Post:** election results pages.
  - **Stripe:** its Black Friday live microsite.

---

## How SSR works

```
User ── GET /account/orders ──▶ Server (Node.js)
                                 1. read cookies → who is this?
                                 2. query DB: orders for this user      ← waits for data (e.g. 300 ms)
                                 3. render React → HTML
                                 4. send HTML (+ RSC payload)
User ◀───────── HTML (personalised, fresh) ─────────┘
  5. browser shows the content
  6. downloads JS for Client Components, hydrates them → interactive
```

**In the App Router:** a route is rendered at request time when it uses request data (`cookies()`, `headers()`, `searchParams`, `connection()`) or uncached data. With **streaming**, the server sends the shell first and each `<Suspense>` boundary as its data resolves, so a slow query doesn't block the whole page:

```tsx
// app/account/orders/page.tsx
import { Suspense } from 'react'
import { cookies } from 'next/headers'

export default function OrdersPage() {
  return (
    <>
      <h1>Your orders</h1>                              {/* sent immediately */}
      <Suspense fallback={<OrdersSkeleton />}>
        <Orders />                                     {/* rendered per request, streamed */}
      </Suspense>
    </>
  )
}

async function Orders() {
  const session = (await cookies()).get('session')?.value   // request-time data → SSR
  const orders = await getOrdersForSession(session)
  return <OrderList orders={orders} />
}
```

**In the Pages Router:** `export async function getServerSideProps(ctx)` runs on every request and passes props to the page.

**HTTP caching:** dynamically rendered pages get `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, so a CDN **never shares** one user's page with another.

| ✅ SSR pros | ⚠️ SSR cons |
|---|---|
| Always fresh, exact data (prices, stock, account balances) | Server work and cost **on every request**; you need capacity for traffic spikes |
| Personalisation (user, cart, A/B variant, geo) | **TTFB = the slowest data source** (unless you stream) |
| SEO-friendly HTML, unlike client-side rendering | Not CDN-cacheable when personalised |
| Secrets and data access stay on the server | Database load scales with traffic |

**Use SSR for:** account pages, carts and checkout, dashboards, search results with many filter combinations, admin tools, and anything per user or needing to be exact.

---

## How ISR works

**Stale-while-revalidate, step by step** (time-based, revalidate = 60 s):

```
t=0      build: /products/42 rendered → cached HTML v1
t=10s    visitor A → cache HIT (v1, instant)
t=59s    visitor B → cache HIT (v1, instant)
t=61s    visitor C → still gets v1 instantly (STALE)… and triggers a background regeneration
                     server renders v2 with fresh data → replaces the cache
t=62s    visitor D → cache HIT (v2, fresh)
         if regeneration FAILS → the old page keeps being served (no outage)
```

**Two ways to refresh:**

| | **Time-based** | **On-demand** |
|---|---|---|
| Trigger | The lifetime expires (e.g. every 60 s / every hour) | **An event**: a CMS publish, a price change, a webhook |
| Freshness | Up to one interval old | Updates almost immediately |
| Next.js 16 (Cache Components) | `"use cache"` + `cacheLife('hours')` or `cacheLife({ revalidate: 60 })` | `cacheTag('product-42')` + `revalidateTag('product-42', 'max')`, or `updateTag()` in a Server Action |
| Previous model / Pages Router | `export const revalidate = 60`; `fetch(url, { next: { revalidate: 60 } })`; `getStaticProps` → `revalidate: 60` | `revalidateTag` / `revalidatePath`; `res.revalidate('/products/42')` |

```tsx
// Next.js 16: ISR with Cache Components
// app/products/[slug]/page.tsx
import { cacheLife, cacheTag } from 'next/cache'

export async function generateStaticParams() {
  return (await getTopSellers()).map((p) => ({ slug: p.slug }))   // build only the top sellers
}

export default async function ProductPage({ params }: PageProps<'/products/[slug]'>) {
  const { slug } = await params
  return <ProductDetails slug={slug} />
}

async function ProductDetails({ slug }: { slug: string }) {
  'use cache'
  cacheLife('hours')                // time-based safety net
  cacheTag(`product-${slug}`)       // on-demand: revalidateTag(`product-${slug}`, 'max') from the PIM/CMS webhook
  const product = await getProduct(slug)
  return <Product {...product} />
}
```

**Pages that weren't built at build time** (the long tail):
- **Pages Router:** `fallback: 'blocking'` renders the page on the first request, then caches it.
- **Next.js 16.3+ with Cache Components:** the first visitor instantly gets the **App Shell** (a loading UI), and the full page is prerendered in the background and cached for every later visitor.

**HTTP caching:** ISR pages are sent with `Cache-Control: s-maxage=<revalidate>, stale-while-revalidate`, so a CDN can cache them too.

| ✅ ISR pros | ⚠️ ISR cons |
|---|---|
| **Static speed** (CDN, very low TTFB) and low server cost | Content can be **stale** for up to one interval (time-based) |
| **No full rebuilds** for content changes: millions of pages are possible | **Not for per-user data** (it's shared by everyone) |
| Handles traffic spikes: most requests never reach the backend | **Self-hosting with many instances needs a shared cache** and coordinated tag invalidation |
| Survives backend failures: the old page stays live | Debugging staleness across layers (server, CDN, browser) is harder |

---

## SSG vs ISR vs SSR vs PPR

| | **SSG** | **ISR** | **SSR** | **PPR** (Next.js 16) |
|---|---|---|---|---|
| HTML generated | At build | At build/first visit, then regenerated | Every request | Shell at build + dynamic parts per request |
| Freshness | Until the next deploy | Interval or event | Always fresh | Shell: cached; holes: fresh |
| Personalised | ❌ | ❌ | ✅ | ✅ (in the dynamic holes) |
| Speed (TTFB) | ⚡ CDN | ⚡ CDN (rare regenerations) | Server + data time | ⚡ shell, streamed holes |
| Server cost | Lowest | Low | Highest | Low + only the dynamic parts |
| Build time for 1M pages | Huge | Small (build the popular pages, generate the rest on demand) | None | Small |
| Typical pages | Docs, legal, landing pages | Products, articles, listings, auctions | Account, cart, checkout, dashboards | Product page with a personal price or cart |

**Decision guide:**
1. Is it **different per user**? → **SSR**, or a **PPR dynamic hole** for just that part.
2. Is it shared, and can it be **a few seconds to minutes old**? → **ISR** (time-based).
3. Must it update **the moment content changes**? → **ISR on-demand** (tags + webhooks).
4. Does it **almost never change**? → **SSG** / a long `cacheLife('max')`.

---

## Real companies

**These examples come from published customer case studies** (self-reported by Vercel and the companies):

**Desenio (art & poster e-commerce): ISR at scale**
- **Problem:** an enormous number of pages across many markets and **five languages**. A full static deploy **took hours**, and even small changes took about 20 minutes to propagate, then about 2 hours before customers saw them.
- **With ISR:** builds take **a few minutes**, and the team **launched 30 new markets in one month**.
- **Reported results after the move:** **37% lower bounce rate, 48% longer sessions, 34% better conversion** (for the whole migration, not ISR alone).

**Mecum Auctions (collector car auctions): on-demand ISR for a huge catalogue**
- **Scale:** **275,000 lot pages** and **8 million assets**, with hundreds of updates a day and **over 120 million views a year**.
- **How:** instead of pre-building every lot, each page is **generated on its first request**, cached, and **revalidated in the background** after its period, so car details stay current without slowing users down.
- **The stack:** Salesforce (data) → WordPress (CMS) + Algolia (search), on a headless setup.

**The Washington Post (news): election results**
- **Election night:** **over 1,000 elections across 52 results pages**, with the US House page showing **~400 races on one page**, under very spiky traffic.
- **Before:** the rendering layer ran on AWS ECS with "an intricate revalidation system leveraging SQS and EC2" (complex and expensive).
- **The goal:** migrate to Next.js 12 to **use ISR**: static-site scalability with dynamic responsiveness, "without rebuilding the entire project".

**Stripe (Black Friday live microsite): ISR + client polling**
- **Built in 19 days.**
- **How:** `getStaticProps` for the first render, **ISR** to regenerate and spread content across the edge network so most requests never hit the backend, and **SWR on the client** for real-time numbers, with a **one-second max-age cache**.
- **Result:** backend load dropped, and API uptime stayed above 99.999%.

**Other well-known sites built with Next.js** (from the official showcase): **Nike, OpenAI, Claude, NerdWallet, Netflix Jobs, Zapier, Sonos, Solana**. Large sites like these typically **mix strategies per route**: static or ISR for marketing, product and content pages, and request-time rendering for accounts, carts and personalised areas. Their exact per-page choices aren't public, so describe this as the typical pattern, not a fact about a specific company.

---

## Pitfalls & best practices

**SSR:**
- **Stream** slow parts behind `<Suspense>`, so TTFB isn't tied to the slowest query.
- **Fetch in parallel** (`Promise.all`); avoid slow `await`s in layouts.
- Keep the **database close to the server region** (Edge functions far from the database are often *slower*).
- Cache **shared sub-parts** (navigation, product info) with `"use cache"`, even on a dynamic page. That's PPR.
- **Load-test** for peaks: SSR capacity is your bottleneck on Black Friday.

**ISR:**
- **Tag by domain data** (`product-42`, `category-shoes`), and call `revalidateTag` **after** the database or CMS write commits.
- **Verify webhook signatures**, and deduplicate events.
- **Choose the interval from the business need:** stock ≈ seconds/minutes (or stream it), articles ≈ hours, legal pages ≈ `max`.
- **Never put per-user data** in an ISR page. Stream it in a dynamic hole.
- **Self-hosted with multiple instances:** a shared cache handler (Redis) + tag coordination, or pages will differ between pods.
- **Pre-build only the popular pages** (`generateStaticParams`), and let the long tail generate on demand.

---

## Interview Q&A

**Q: Explain SSR and its trade-offs.**
HTML rendered per request on the server: fresh, personalised and SEO-friendly, but it costs server time on every request, and TTFB depends on the data unless you stream. It can't be shared through a CDN when personalised.

**Q: Explain ISR step by step.**
A page is cached as static HTML. After its revalidation time (or an on-demand trigger), the next request still gets the cached page while Next.js regenerates it in the background; later requests get the new version, and failures keep the old one. On-demand ISR uses tags or paths triggered by webhooks.

**Q: Time-based vs on-demand ISR?**
Time-based refreshes after an interval (simple, a bit stale). On-demand refreshes when data changes, via `revalidateTag` / `revalidatePath` / `updateTag` from webhooks or Server Actions (fresh, more setup).

**Q: When would you choose SSR over ISR?**
When content is per user or must be exact at every request (accounts, carts, checkout, live dashboards). For shared content that can be briefly stale, ISR is faster and cheaper.

**Q: Give real examples of ISR.**
Desenio cut full-site builds from hours to minutes across many markets. Mecum generates 275,000 auction lot pages on demand. The Washington Post used ISR for election results pages. Stripe's Black Friday microsite combined ISR with client-side polling.

**Q: How does Partial Prerendering relate to SSR and ISR?**
It combines them on one page: a cached or ISR-style static shell, with SSR-style dynamic holes streamed in the same response.

---

## 🎯 Interview answer

> "SSR renders HTML on every request: the server reads cookies or headers, fetches data, renders, and sends personalised, always-fresh HTML that's good for SEO, but every request costs server time, TTFB depends on the slowest data unless I stream with Suspense, and the response is private, so a CDN can't share it. I use it for accounts, carts, checkout and dashboards. ISR serves cached static HTML and regenerates it in the background with stale-while-revalidate: after the interval, the next visitor still gets the cached page while a new one is built, and if regeneration fails the old page stays live. On-demand ISR uses tags and webhooks, like `revalidateTag` from the CMS, to refresh right after content changes. In Next.js 16 that's `use cache` with `cacheLife` and `cacheTag`; in older versions it's `revalidate`, or `getStaticProps` with `fallback: 'blocking'`. ISR gives near-static speed and cost without full rebuilds, which is why Desenio cut builds from hours to minutes across many markets, Mecum generates 275,000 auction pages on demand, The Washington Post used it for election results, and Stripe's Black Friday site combined it with client polling. The trade-offs are staleness, no per-user data, and the need for a shared cache when self-hosting multiple instances. Partial Prerendering combines both: an ISR-style static shell with SSR-style streamed dynamic parts on the same page."
