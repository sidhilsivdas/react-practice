## Quick answer

**In the App Router, fetch data on the server, in Server Components:** `async` components that `await` a database query, an ORM call or `fetch()`. There's no `useEffect`, no loading spinner logic and no API route in between.

- **Avoid waterfalls:** start independent requests **in parallel** (`Promise.all`, or several components behind separate `<Suspense>` boundaries).
- **Deduplicate** within a request with `React.cache()` (and automatic `fetch` memoisation).
- **Cache** with `"use cache"`, and **stream** slow parts with `<Suspense>`.
- **Fetch on the client** (TanStack Query, SWR) only for data that changes after load: polling, infinite scroll, highly interactive filters, or live updates.

---

## Fetching in Server Components

```tsx
// app/orders/page.tsx
import { getOrders } from '@/lib/data'     // a server-only data access layer

export default async function OrdersPage() {
  const orders = await getOrders()        // DB / ORM / internal API: secrets stay on the server
  return <OrderTable orders={orders} />
}
```

```ts
// lib/data.ts
import 'server-only'
import { cache } from 'react'
import { db } from './db'
import { verifySession } from './dal'

export const getOrders = cache(async () => {
  const { userId } = await verifySession()            // authorisation inside the data layer
  return db.order.findMany({
    where: { userId },
    select: { id: true, total: true, status: true },  // only the fields the UI needs (a DTO)
  })
})
```

**Why this is better than client fetching for the first load:**
- No client → API → database round trips after JavaScript loads. The data is ready in the HTML (better LCP).
- Secrets and database credentials never reach the browser.
- Less JavaScript: no data-fetching library or loading state code for this data in the bundle.

**Don't call your own Route Handlers from Server Components** (`fetch('http://localhost:3000/api/orders')`). It's an unnecessary HTTP hop. Call the data function directly.

---

## Waterfalls & parallel fetching

**A waterfall = request B waits for request A even though it doesn't need A's result:**

```tsx
// ❌ sequential: 300 ms + 500 ms + 400 ms = 1.2 s before anything renders
const user = await getUser(id)
const orders = await getOrders(id)
const recommendations = await getRecommendations(id)

// ✅ parallel: ~500 ms (the slowest one)
const [user, orders, recommendations] = await Promise.all([
  getUser(id),
  getOrders(id),
  getRecommendations(id),
])
```

**Even better: split into components with their own `<Suspense>`.** Each one starts fetching as soon as React renders it, and each streams independently:

```tsx
export default async function Page({ params }: PageProps<'/users/[id]'>) {
  const { id } = await params
  return (
    <>
      <Suspense fallback={<ProfileSkeleton />}><Profile id={id} /></Suspense>
      <Suspense fallback={<OrdersSkeleton />}><Orders id={id} /></Suspense>
    </>
  )
}
```

**Sequential is correct when B depends on A** (`getUser`, then `getTeam(user.teamId)`). Then stream the dependent part behind its own boundary so the rest of the page doesn't wait.

**Hidden waterfalls:**
- A **layout that awaits** something slow blocks all its child pages.
- **Parent components** that await before rendering children that also fetch.
- **Client components that fetch in `useEffect` after hydration:** server HTML → JavaScript download → hydrate → fetch → render.
- **Preload pattern:** call `void getItem(id)` early (a function wrapped in `React.cache`), so the request starts before the component that awaits it renders.

---

## Deduplication with React.cache

**The same data is often needed in several places in one request:** `generateMetadata`, the layout, the page and a nested component. Wrap the function in `cache()` so it runs **once per request**:

```ts
import { cache } from 'react'

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } })
})

// app/products/[id]/page.tsx
export async function generateMetadata({ params }: PageProps<'/products/[id]'>) {
  const product = await getProduct((await params).id)   // query 1…
  return { title: product?.title }
}
export default async function Page({ params }: PageProps<'/products/[id]'>) {
  const product = await getProduct((await params).id)   // …reused: no second query
  …
}
```

**`React.cache` vs `"use cache"`:**

| | `React.cache()` | `"use cache"` |
|---|---|---|
| Scope | **One request / render pass** | **Across requests** and users (with a lifetime) |
| Purpose | Deduplicate repeated calls during a render | Avoid recomputing for every request |
| Invalidation | Automatic: gone after the request | `cacheLife`, tags, revalidation APIs |
| Works in Server Actions / Route Handlers | No (they're not a render pass) | Yes |

`fetch()` calls with the same URL and options are also **memoised automatically** during a render.

---

## Client-side fetching

**Use client fetching when the data changes after the page has loaded, or depends on client interaction:**

| Need | Tool |
|---|---|
| Polling, refetch on window focus, background updates | **TanStack Query** / SWR (`refetchInterval`) |
| Infinite scroll, "load more" | `useInfiniteQuery` (initial page from the server) |
| Highly interactive filters with instant feedback | Client query + debounce; or update the URL search params and let the server re-render |
| Real-time (chat, prices) | WebSockets / SSE in a Client Component |
| Optimistic UI for mutations | `useOptimistic` + Server Actions, or TanStack Query mutations |

**Hybrid pattern: server prefetch + client cache:**

```tsx
// Server Component: prefetch, then pass the cache to the client
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function Page() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: ['notifications'], queryFn: getNotifications })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Notifications />     {/* Client Component: useQuery(['notifications']) gets the data instantly, then polls */}
    </HydrationBoundary>
  )
}
```

**Or pass a Promise and read it with `use()`** in a Client Component (see **Server vs Client Components**).

---

## Server Actions vs Route Handlers vs direct calls

| | **Direct call in a Server Component** | **Server Action** (`"use server"`) | **Route Handler** (`route.ts`) |
|---|---|---|---|
| For | **Reading** data while rendering | **Mutations** from your own UI (forms, buttons) | **Public HTTP APIs**: webhooks, mobile apps, third parties, file downloads, OAuth callbacks |
| Called by | The server during render | Your React components (a POST under the hood) | Any HTTP client |
| Caching | `"use cache"` | Not cached; triggers revalidation | `GET` can be prerendered/cached |
| Good to know | The default choice for reads | Executed **one at a time** per client (sequential dispatch), so **not** for parallel data fetching | A stable HTTP contract you can version |

---

## Error & empty states

**Handle expected failures explicitly**, not as a generic 500 page:

```tsx
async function Orders({ id }: { id: string }) {
  const result = await getOrders(id).catch(() => null)
  if (result === null) return <p role="alert">Couldn't load orders. <RetryButton /></p>   // a partial failure
  if (result.length === 0) return <p>No orders yet.</p>                                    // an empty state
  return <OrderList orders={result} />
}
```

- **`notFound()`** for missing records, giving a 404 status and SEO-correct output.
- **`error.tsx` / `catchError()`** for unexpected errors per segment or component, with `retry()`.
- **Partial failures:** wrap independent widgets in their own error boundaries, so one failing recommendation panel doesn't break the product page.
- **Timeouts:** use `AbortSignal.timeout(3000)` on slow upstream calls, and show fallback content.

---

## Interview Q&A

**Q: How do you fetch data in a Server Component?**
Make the component `async` and `await` the data call (an ORM, database, internal API or `fetch`) directly, through a server-only data access layer that also checks authorisation.

**Q: What are request waterfalls and how do you avoid them?**
Independent requests running one after another. Start them in parallel with `Promise.all`, split them into components behind separate Suspense boundaries, avoid slow awaits in layouts, and use the preload pattern.

**Q: When would you fetch on the client instead of the server?**
For data that changes after load or depends on interaction: polling, infinite scroll, live updates, and some interactive filtering. Usually with the initial data still coming from the server.

**Q: `React.cache` vs `"use cache"`?**
`React.cache` deduplicates calls within one request's render; `"use cache"` persists results across requests with a lifetime and tags.

**Q: Should a Server Component call your own API route?**
No. Call the data function directly; the extra HTTP hop adds latency and complexity.

---

## 🎯 Interview answer

> "In the App Router I fetch data on the server: async Server Components await a server-only data access layer that checks authorisation and returns minimal DTOs, so secrets stay on the server, the data is in the first HTML, and no fetching code ships to the client. I avoid waterfalls by starting independent requests in parallel with `Promise.all` or, better, by splitting them into components behind their own Suspense boundaries so each streams independently, keeping slow awaits out of layouts and using a preload pattern where useful. Sequential fetching is only for real dependencies. `React.cache` deduplicates calls within a request, for example between `generateMetadata` and the page, while `use cache` persists results across requests with lifetimes and tags. I don't call my own Route Handlers from Server Components. Client-side fetching with TanStack Query is for data that changes after load, like polling, infinite scroll or live updates, often hydrated from a server prefetch or passed as a promise read with `use()`. Server Actions are for mutations, since they run sequentially, and Route Handlers for public HTTP contracts like webhooks and mobile clients. I handle empty, not-found and partial-failure states explicitly with `notFound()`, error boundaries per widget, and timeouts on upstream calls."
