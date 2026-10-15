## Quick answer

**Caching in Next.js depends on the version, so say that first in an interview.**

- **Next.js 16 with Cache Components** (`cacheComponents: true`; recommended for all apps since 16.4, enabled in new projects, the default in 17):
  - Everything is **dynamic by default**.
  - You **opt in** with **`"use cache"`** on functions, components or pages, set the lifetime with **`cacheLife('hours')`**, and label entries with **`cacheTag('products')`** for on-demand invalidation.
  - Invalidate with **`revalidateTag(tag, 'max')`** (stale-while-revalidate), **`updateTag(tag)`** (read-your-writes, in Server Actions) or **`revalidatePath()`**.
- **Previous model** (Next.js 13–15, or 16 without the flag):
  - `fetch` options (`cache`, `next.revalidate`, `next.tags`), route segment config (`export const revalidate`, `export const dynamic`) and `unstable_cache`.
  - **Next.js 14** cached `fetch` by default; **Next.js 15 changed that to uncached by default.**

---

## Cache Components: "use cache"

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,    // part of the model since 16.3/16.4; set it explicitly
}
export default nextConfig
```

**`"use cache"` caches the return value of an async function or component.** Think of it as a **component-level `Cache-Control`**. It works at three levels:

```tsx
import { cacheLife, cacheTag } from 'next/cache'

// 1. data level: a function
export async function getProducts(category: string) {
  'use cache'
  cacheLife('hours')                  // how long the entry stays fresh
  cacheTag('products', `category-${category}`)   // labels for on-demand invalidation
  return db.product.findMany({ where: { category } })
}

// 2. UI level: a component (its rendered output is cached)
async function FeaturedProducts() {
  'use cache'
  cacheLife('days')
  const products = await getFeatured()
  return <ProductGrid products={products} />
}

// 3. file level: "use cache" at the top of a file caches every exported function
```

**Cache keys are automatic:** the function's **arguments** and any **captured variables** become part of the key. `getProducts('shoes')` and `getProducts('hats')` are separate entries, and the compiler generates the key.

**`cacheLife` profiles:** built-in names like `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'` and `'max'` (plus an implicit `'default'`), or custom profiles in `next.config`. Each profile has three times:
- **`stale`:** how long the **browser** may reuse it without asking.
- **`revalidate`:** after this, the server regenerates it in the background (stale-while-revalidate).
- **`expire`:** after this with no traffic, the next request waits for fresh data.

| Profile | `stale` | `revalidate` | `expire` | For |
|---|---|---|---|---|
| `default` (no `cacheLife` call) | 5 min | 15 min | never | Standard content |
| `seconds` | 30 s | 1 s | 1 min | Real-time-ish data (excluded from prerenders: becomes a "dynamic hole") |
| `minutes` | 5 min | 1 min | 1 h | Feeds, news |
| `hours` | 5 min | 1 h | 1 day | Inventory, prices updated during the day |
| `days` | 5 min | 1 day | 1 week | Blog posts, articles |
| `weeks` | 5 min | 1 week | 30 days | Newsletters, podcasts |
| `max` | 5 min | 30 days | 1 year | Legal pages, archives |

(From the official `cacheLife` reference. Custom profiles can be defined in `next.config.ts`, and an inline object like `cacheLife({ revalidate: 900 })` also works.)

**Always pair `"use cache"` with a `cacheLife`**, so the lifetime is a deliberate decision. Nested caches without an explicit outer `cacheLife` inherit shorter inner lifetimes, and Next.js even errors when a short-lived cache is nested inside one without an explicit lifetime.

---

## Dynamic data & Suspense

**Request-time APIs can't be read inside a shared cache scope.** A shared entry would leak one user's data to another.

```tsx
import { cookies } from 'next/headers'
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<p>Loading…</p>}>       {/* required: dynamic content streams */}
      <Recommendations />
    </Suspense>
  )
}

async function Recommendations() {
  const userId = (await cookies()).get('uid')?.value    // request-time: read OUTSIDE the cache
  return <CachedRecs userId={userId} />                 // pass the value in as an argument
}

async function CachedRecs({ userId }: { userId?: string }) {
  'use cache'                                           // userId becomes part of the key
  cacheLife('minutes')
  return <List items={await getRecommendations(userId)} />
}
```

**Request-time ("runtime") APIs:** `cookies()`, `headers()`, `searchParams`, `params` (not listed in `generateStaticParams`) and `connection()`. Components using them must be inside `<Suspense>`, or the dev overlay shows a **blocking-route** error.

**Random values and time:** `Math.random()`, `Date.now()` and `crypto.randomUUID()` need a decision. Either call **`await connection()`** first (a unique value per request, inside `<Suspense>`), or put them inside `"use cache"` (one value shared until revalidation).

**The variants:**

| Directive | Stored | Use for |
|---|---|---|
| `"use cache"` | In memory per server instance by default (plus prerendered into the static shell when possible) | Shared data and UI |
| **`"use cache: remote"`** | A **durable, shared cache handler** (e.g. Redis), configured with `cacheHandlers` | Shared entries across **many instances or serverless functions**, when the hit rate is high |
| **`"use cache: private"`** | **Only in the browser** | Per-user data that reads cookies/headers directly, so it can be included in prefetches |

**All caches are scoped to one deployment:** the build ID is part of the cache key, so a new deploy starts fresh.

---

## Revalidation APIs

| API | Where | Behaviour | Use when |
|---|---|---|---|
| **`revalidateTag(tag, 'max')`** | Server Actions, Route Handlers | Marks tagged entries stale: **the next visitor gets cached data while it refreshes in the background** (stale-while-revalidate). The single-argument form is deprecated in 16. | CMS webhooks, catalogue updates: eventual consistency is fine |
| **`updateTag(tag)`** (new in 16) | **Server Actions only** | **Expires and refetches immediately** in the same request: **read-your-writes** | The user edits their profile and must see the change right away |
| **`revalidatePath('/blog')`** | Server Actions, Route Handlers | Invalidates everything for that path (built on tags internally); `'layout'` type for nested paths | Simple cases; avoid invalidating many paths on every write |
| **`refresh()`** (new in 16) | Server Actions only | Re-renders **uncached** data on the page; doesn't touch the cache | Update notification counts or live data after an action |
| `router.refresh()` | Client | Re-fetches the current route's server data | After a client-side mutation |

```ts
'use server'
import { updateTag, revalidateTag } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const user = await verifySession()
  await db.user.update({ where: { id: user.id }, data: { name: String(formData.get('name')) } })
  updateTag(`user-${user.id}`)          // the user sees the new name immediately
}

// app/api/cms-webhook/route.ts
export async function POST(req: Request) {
  if (req.headers.get('x-signature') !== process.env.CMS_SECRET) return new Response('Forbidden', { status: 403 })
  const { slug } = await req.json()
  revalidateTag(`post-${slug}`, 'max')  // background refresh for everyone
  return Response.json({ revalidated: true })
}
```

**Tag domain data, not UI components** (`product-42`, `products`). Then one update reaches every page that shows that product. **Invalidate only after the database write has committed.**

---

## The cache layers

**When debugging, name the exact layer that's stale:**

| Layer | What | Where | Lifetime |
|---|---|---|---|
| **Request memoisation** | Duplicate `fetch` / `React.cache()` calls in **one render** run once | Server, per request | One request |
| **Data / `"use cache"` cache** | Results of cached functions and fetches | Server: in memory per instance, on disk, or a remote handler | `cacheLife` / `revalidate` / tags |
| **Full route cache / static shell** | Prerendered HTML + RSC payload | Server disk / CDN | Until revalidated or the next deploy |
| **Client router cache** | RSC payloads of visited and prefetched segments | Browser memory | The session; `stale` times (`staleTimes` config in the previous model) |
| **CDN / HTTP cache** | Responses with `Cache-Control: public` | CDN edge | Headers (`s-maxage`, `stale-while-revalidate`) |
| **Browser HTTP cache / service worker** | Static assets, API responses | Browser | Headers |

---

## Previous model (Next.js 13–15)

**Interviewers often work on these codebases, so know both models.**

```tsx
// fetch-level
fetch(url, { cache: 'force-cache' })                      // cache indefinitely (until revalidated)
fetch(url, { cache: 'no-store' })                         // always fresh
fetch(url, { next: { revalidate: 60 } })                  // ISR: refresh every 60 s
fetch(url, { next: { tags: ['products'] } })              // for revalidateTag('products')

// route segment config (exported from page/layout/route files)
export const revalidate = 60                              // default revalidation for the route
export const dynamic = 'force-dynamic'                    // 'auto' | 'force-dynamic' | 'error' | 'force-static'
export const dynamicParams = true

// non-fetch data (DB queries): unstable_cache (replaced by "use cache")
const getUser = unstable_cache(async (id) => db.user.find(id), ['user'], { revalidate: 60, tags: ['users'] })
```

**Version differences that cause bugs:**

| | Next.js 14 | Next.js 15 | Next.js 16 + Cache Components |
|---|---|---|---|
| `fetch` | **Cached by default** | **Not cached** by default | Not cached; use `"use cache"` |
| `GET` Route Handlers | Cached by default | Not cached by default | Follow the same prerendering rules as pages |
| Client router cache for pages | Kept ~30 s / 5 min | **`staleTime` 0** for pages by default | Controlled by `cacheLife` `stale` |
| Mental model | Implicit caching | Less implicit | **Explicit, opt-in** |

---

## Debugging stale data

**"The page shows old data in production. How do you debug it?"** (a very common senior question)

1. **Reproduce and identify the layer:** Is the database correct? Does a **hard reload** fix it (the client router cache)? Does it happen on all instances (a server cache vs one pod)? Do the response headers show a CDN `HIT` / `age`?
2. **Check the version and model:** Next.js 14 `fetch` defaults? Is `cacheComponents` on? A forgotten `revalidate`, or a long `cacheLife`?
3. **Check invalidation:** Does the mutation call `revalidateTag` / `updateTag` with the **same tag** that the cached function uses? Does it run **after** the write commits? Does the CMS webhook reach the server and pass verification?
4. **Multi-instance deployments:** with the default in-memory cache, `revalidateTag` on one pod doesn't clear the others. Use a **shared cache handler** (`"use cache: remote"` + `cacheHandlers`, or `cacheHandler` for ISR) and implement **tag coordination** (`refreshTags()`).
5. **The CDN:** respects `s-maxage` / `stale-while-revalidate`? Purged on revalidation?
6. **Fix the invalidation path, not just the symptom.** Purging the cache by hand isn't a diagnosis. Add logging of cache tags, the build ID and the instance ID.

**Personalised data:** never cache user-specific data in a shared scope. Consider **cardinality** (one entry per user can explode memory), privacy, and eviction. Use `"use cache: private"`, pass the user ID as a key argument deliberately, or don't cache it.

---

## Interview Q&A

**Q: Is `fetch` cached by default in the App Router?**
It depends on the version: yes in Next.js 14, no since 15. With Next.js 16 Cache Components, nothing is cached unless you use `"use cache"`.

**Q: How does `"use cache"` work?**
It caches the return value of an async function, component or file. Arguments and captured values form the key automatically, `cacheLife` sets the stale, revalidate and expire times, and `cacheTag` labels entries for on-demand invalidation.

**Q: `revalidateTag` vs `updateTag` vs `revalidatePath`?**
`revalidateTag(tag, profile)` gives stale-while-revalidate (eventual consistency, e.g. webhooks). `updateTag(tag)` is for Server Actions with read-your-writes (immediate). `revalidatePath` invalidates a whole path.

**Q: Can you cache personalised data?**
Not in a shared cache scope with request APIs inside. Read cookies outside and pass values as arguments, use `"use cache: private"` (browser only), and watch cardinality and privacy.

**Q: Why does caching work locally but fail across containers?**
The default cache is per instance (memory/disk), so invalidation on one instance doesn't reach the others. Use a shared remote cache handler with tag coordination, and the same build and deployment ID.

---

## 🎯 Interview answer

> "I first ask which Next.js version and model the team uses, because caching changed: Next.js 14 cached fetch by default, 15 stopped doing that, and 16's Cache Components, which 16.4 recommends for every app and 17 makes the default, is dynamic by default with explicit opt-in caching. There, `use cache` caches an async function, component or file. Its arguments become the key automatically, I always pair it with `cacheLife` to set the stale, revalidate and expire times, and `cacheTag` labels entries by domain data like `product-42`. Request-time APIs like cookies and headers can't be read inside a shared cache, so I read them in an uncached component behind Suspense and pass values in as arguments, or use `use cache: private`; `use cache: remote` puts entries in a shared handler for multi-instance deployments. For invalidation, `revalidateTag` with a profile gives stale-while-revalidate for webhooks, `updateTag` gives read-your-writes in Server Actions, `revalidatePath` handles simple path invalidation, and `refresh` updates uncached data, always after the write commits. I know the older model too: fetch `cache` and `next.revalidate` options, segment `revalidate` and `dynamic`, and `unstable_cache`. When data is stale in production I identify the layer, whether it's request memoisation, the server cache, the static shell, the client router cache, the CDN or the browser; check tags and invalidation; and for multiple instances use a shared cache handler with tag coordination."
