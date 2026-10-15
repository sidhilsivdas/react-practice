## Quick answer

**Next.js decides per route, and with Cache Components per component, whether output is produced ahead of time or at request time:**

| Strategy | HTML is produced | Next.js tool |
|---|---|---|
| **Static (SSG)** | At **build time**, served from a CDN | Default for code without request data; `generateStaticParams` for dynamic segments |
| **ISR** (incremental static regeneration) | At build or first visit, then **regenerated in the background** | `cacheLife` / `revalidateTag` (16), `export const revalidate` (previous model) |
| **Dynamic (SSR)** | **On every request** | Reading `cookies()`, `headers()`, `searchParams`, or uncached data |
| **Partial Prerendering (PPR)** | A **static shell** at build time + **dynamic parts streamed** in the same response | The default with **Cache Components**: `<Suspense>` around dynamic parts |
| **Streaming** | Sent **in chunks** as each part is ready | `loading.tsx`, `<Suspense>` |
| **CSR** | In the browser | Client Components + client data fetching (TanStack Query, SWR) |

**Rule:** decide from **how fresh the data must be** and **who it's for** (everyone or one user), not from habit.

---

## Static vs dynamic

**Previous model (Next.js 13–15, and 16 without Cache Components):** a **whole route** was static or dynamic.
- Using any **request-time API** (`cookies()`, `headers()`, `searchParams`, `connection()`, an uncached `fetch`) made the **entire route dynamic**.
- One personalised widget made the whole page server-rendered on every request.

**With Cache Components (Next.js 16, recommended since 16.4, the default in 17):** there's no all-or-nothing choice.
- **Everything is dynamic by default** and runs at request time, *unless* it can complete during prerendering or is cached.
- At build time, Next.js renders each route and builds a **static shell**. It contains:
  - static content (pure computation, module imports)
  - **cached** content (`"use cache"`)
  - **`<Suspense>` fallbacks** for dynamic parts
- Dynamic parts (cookies, uncached data) **stream in** at request time, in the **same HTTP response**.
- This is **Partial Prerendering (PPR)**.

```tsx
// app/product/[id]/page.tsx: with cacheComponents: true
import { Suspense } from 'react'

export default function ProductPage({ params }: PageProps<'/product/[id]'>) {
  return (
    <>
      <Header />                                         {/* static: in the shell */}
      <ProductInfo params={params} />                    {/* "use cache": in the shell (for known IDs) */}
      <Suspense fallback={<PriceSkeleton />}>            {/* fallback in the shell… */}
        <PersonalPrice params={params} />                {/* …real content streams per request (reads cookies) */}
      </Suspense>
    </>
  )
}
```

**What can't complete during prerendering must be handled explicitly.** In development, Next.js shows a **"blocking route"** insight and tells you to either **wrap it in `<Suspense>`** (stream it), **cache it** with `"use cache"`, or opt the route out. That keeps every route producing a fast static shell.

---

## Static generation & ISR

**Dynamic segments + `generateStaticParams`:**

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPublishedPosts()
  return posts.map((post) => ({ slug: post.slug }))   // these pages are built at build time
}
```

- **Listed params** are prerendered at build time.
- **Unknown params:**
  - **With Cache Components:** they get the reusable **App Shell** instantly, then the concrete page is generated in the background and cached for the next visitor (ISR).
  - **Previous model:** `export const dynamicParams = true` (the default) renders them on first visit and caches them; `false` returns a 404.

**Time-based and on-demand regeneration (ISR):**

```tsx
// Next.js 16 with Cache Components
async function getPost(slug: string) {
  'use cache'
  cacheLife('hours')            // regenerate in the background after the lifetime
  cacheTag(`post-${slug}`)      // and/or on demand: revalidateTag(`post-${slug}`, 'max') from a CMS webhook
  return cms.getPost(slug)
}

// previous model
export const revalidate = 3600                                   // the whole route, in seconds
fetch(url, { next: { revalidate: 3600, tags: ['posts'] } })      // per fetch
```

**ISR = stale-while-revalidate:** after expiry, the next visitor still gets the **cached** page instantly, while Next.js regenerates it in the background. The visitor after that gets the fresh one.

---

## Streaming & Suspense

**Without streaming,** the server waits for the **slowest** data before sending anything.
**With streaming,** it sends the shell immediately and **each `<Suspense>` boundary streams in** when its data is ready:

```tsx
export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>                                {/* sent immediately */}
      <Suspense fallback={<CardSkeleton />}>
        <Revenue />                                     {/* 200 ms */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <LatestOrders />                                {/* 2 s: doesn't delay Revenue */}
      </Suspense>
    </>
  )
}
```

**`loading.tsx`** is a shortcut: it wraps the whole page segment in `<Suspense>` with that fallback. It's **instant loading UI** on navigation.

**Benefits:** a faster **TTFB** and **FCP/LCP**; slow parts don't block fast parts; **selective hydration** (React hydrates boundaries as they arrive, and prioritises the one the user interacts with).

**Trade-offs (senior points):**
- **Status codes and headers are sent with the first chunk.** Once streaming starts, you can't change the status to 404 or redirect via HTTP. Next.js handles `notFound()`/`redirect()` inside streamed content with meta tags and client handling, so call them **before** streaming when possible.
- **Badly placed boundaries** cause layout shift (CLS) or a "popcorn" UI. Design skeletons the same size as the content, and group related data.
- **Proxies or CDNs that buffer responses** (nginx, some load balancers) remove the benefit: set `X-Accel-Buffering: no`, and make sure the infrastructure streams end to end.
- **Some bots** need metadata in `<head>`. Next.js detects them and renders those pages fully before sending.

---

## Choosing per route

| Page | Strategy | Why |
|---|---|---|
| Marketing home, landing pages, docs, blog posts | **Static + `"use cache"`** with a long `cacheLife`, revalidated by CMS webhooks | Same for everyone; best LCP and SEO; CDN-served |
| Product detail (e-commerce) | **PPR:** cached product info in the shell, **streamed** price, stock and recommendations, which are personalised or fast-changing | Fast shell + fresh critical data |
| Category / search results | Cached by search params (`"use cache"` with the query as an argument), or dynamic with streaming | Many combinations; short freshness |
| Cart, checkout, account | **Dynamic**, per user, never shared-cached | Private and must be exact |
| Admin dashboards | Dynamic + streaming per panel, or a client-heavy design with TanStack Query | Per user; real-time-ish |
| Live data (stock tickers, chat) | Server shell + **client-side** updates (WebSockets/SSE) | Changes every second |

**Static export (`output: 'export'`):** the whole site becomes static HTML/CSS/JS for any static host. **No server features:** no request-time rendering, Server Actions, Proxy, ISR or cookies, and no default image optimisation.

---

## Pages Router equivalents

| App Router | Pages Router |
|---|---|
| A Server Component with cached data / `generateStaticParams` | `getStaticProps` + `getStaticPaths` |
| `cacheLife` / `revalidate` / `revalidateTag` | `getStaticProps` returning `revalidate: 60`; `res.revalidate('/path')` |
| A dynamic Server Component (cookies / uncached data) | `getServerSideProps` |
| `loading.tsx` / `<Suspense>` streaming | Not available (the whole page waits) |
| PPR | Not available |

(See **Pages Router & migrating to the App Router** and **System Design → Next.js rendering strategies**.)

---

## Interview Q&A

**Q: How does Next.js decide between static and dynamic rendering?**
Previously, per route: using request-time APIs (cookies, headers, searchParams) or uncached data made the whole route dynamic. With Cache Components, per component: everything is dynamic by default, content that can complete during prerendering or is cached with `"use cache"` goes into a static shell, and request-time parts stream behind `<Suspense>`.

**Q: What is Partial Prerendering and what problem does it solve?**
It combines a static shell, served instantly from the CDN, with dynamic holes streamed in the same response. A single personalised component no longer forces the whole page to be rendered on every request.

**Q: What is ISR?**
Static pages that are regenerated after a time or on demand, with stale-while-revalidate: visitors get the cached page instantly while the new version is built in the background.

**Q: What does `generateStaticParams` do?**
It returns the list of dynamic segment values to prerender at build time. Other values are generated on first visit (or 404 if `dynamicParams = false` in the previous model).

**Q: What are the trade-offs of streaming?**
The status code and headers are fixed once streaming starts, poorly placed boundaries cause layout shift, buffering proxies cancel the benefit, and some crawlers need complete HTML.

---

## 🎯 Interview answer

> "I choose rendering per route, and with Cache Components per component, based on how fresh the data must be and whether it's shared or personal. Static generation prerenders at build time, using `generateStaticParams` for known dynamic segments; ISR regenerates those pages in the background on a lifetime or on demand from webhooks, serving stale content while revalidating; request-time rendering handles cookies, headers, search params and uncached data; and streaming with `loading.tsx` or Suspense sends the shell first and each boundary as its data resolves, with selective hydration. In the previous model, one request-time API made the entire route dynamic; with Cache Components, which is recommended in 16.4 and the default in 17, the app is dynamic by default, and Partial Prerendering builds a static shell from static and `use cache` content plus Suspense fallbacks, while request-time parts stream in the same response, and the dev overlay flags anything that blocks the shell. So a product page has its cached details in the shell and a streamed personalised price, marketing pages are fully static, and cart and checkout are dynamic and never shared-cached. I also account for streaming trade-offs: status codes are fixed once streaming starts, skeletons must avoid layout shift, and proxies must not buffer."
