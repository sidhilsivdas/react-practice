## Quick answer

**In the App Router, folders define URL segments, and special files define the UI for each segment:**

- **`page.tsx`:** makes the route public (the URL's UI).
- **`layout.tsx`:** shared UI that wraps child routes and **keeps its state** on navigation.
- **`loading.tsx`**, **`error.tsx`**, **`not-found.tsx`:** loading, error and 404 states per segment.
- **`route.ts`:** an API endpoint (Route Handler) instead of a page.

**Dynamic segments** use brackets (`[id]`). **Route groups** `(name)` organise folders without changing the URL. **Parallel** (`@slot`) and **intercepting** (`(.)`) routes power dashboards and modals. Navigate with `<Link>` and `useRouter` (from `next/navigation`), or `redirect()` on the server.

---

## Special files

| File | Purpose |
|---|---|
| `page.tsx` | The UI of a route. **Without a `page`, a folder isn't a public URL.** |
| `layout.tsx` | Wraps the segment and its children. **Not re-rendered on navigation**: its state is kept. The root `app/layout.tsx` is required and must render `<html>` and `<body>`. |
| `template.tsx` | Like a layout, but **re-mounted on every navigation** (new state, effects re-run). For enter animations or per-page logging. |
| `loading.tsx` | Instant loading UI. Next.js wraps the page in `<Suspense fallback={<Loading />}>`, so the shell streams first. |
| `error.tsx` | An error boundary for the segment. **Must be a Client Component** (`"use client"`). Receives `error` and `retry()`. |
| `global-error.tsx` | Catches errors in the **root layout**. Must render its own `<html>` and `<body>`. |
| `not-found.tsx` | UI shown when `notFound()` is called, or for unmatched URLs |
| `forbidden.tsx` / `unauthorized.tsx` | UI for `forbidden()` / `unauthorized()` (403 / 401). **Still experimental** (`experimental.authInterrupts`). |
| `route.ts` | A Route Handler: `GET`, `POST`… functions. **Can't sit in the same folder as a `page.tsx`.** |
| `default.tsx` | The fallback for a **parallel route slot** when it has no matching segment. **Required for every slot in Next.js 16** (builds fail without it). |

**How they nest** (the component hierarchy for one segment):

```jsx
<Layout>
  <Template>
    <ErrorBoundary fallback={<Error />}>          {/* error.tsx */}
      <Suspense fallback={<Loading />}>            {/* loading.tsx */}
        <NotFoundBoundary fallback={<NotFound />}> {/* not-found.tsx */}
          <Page />
        </NotFoundBoundary>
      </Suspense>
    </ErrorBoundary>
  </Template>
</Layout>
```

**So `error.tsx` doesn't catch errors in the `layout.tsx` of the same segment.** Those go to the parent's `error.tsx` (or `global-error.tsx` for the root layout).

**Metadata files** are also routes: `favicon.ico`, `opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`. (See **Optimizations, metadata & SEO**.)

---

## Dynamic routes

| Folder | Matches | `params` |
|---|---|---|
| `app/blog/[slug]/page.tsx` | `/blog/hello` | `{ slug: 'hello' }` |
| `app/shop/[...slug]/page.tsx` (catch-all) | `/shop/a`, `/shop/a/b/c` (**not** `/shop`) | `{ slug: ['a', 'b', 'c'] }` |
| `app/docs/[[...slug]]/page.tsx` (optional catch-all) | `/docs` **and** `/docs/a/b` | `{ slug: undefined }` or `['a', 'b']` |

**`params` and `searchParams` are Promises** (required since Next.js 16):

```tsx
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<'/products/[id]'>) {               // global typed helper (Next.js 15.5+)
  const { id } = await params
  const { color } = await searchParams             // ?color=red

  const product = await getProduct(id)
  if (!product) notFound()                        // renders not-found.tsx with a 404 status

  return <h1>{product.title} ({color ?? 'default'})</h1>
}

// prerender known IDs at build time (static generation)
export async function generateStaticParams() {
  const products = await getTopProducts()
  return products.map((p) => ({ id: String(p.id) }))
}
```

**Validate `params`.** Bracket folders are **user input**: check the format (for example with zod) before using them in queries.

---

## Organising routes

**Route groups `(folder)`:** the folder name is **not in the URL**. Use them to group routes, or to give sections **different layouts**:

```
app/
├── (marketing)/layout.tsx    ← marketing header/footer
│   ├── page.tsx              ← "/"
│   └── pricing/page.tsx      ← "/pricing"
└── (shop)/layout.tsx         ← shop layout with cart
    └── cart/page.tsx         ← "/cart"
```

**Private folders `_folder`:** excluded from routing completely (`app/_components/Button.tsx`). Colocate helpers safely.

**Colocation:** any file that isn't a special file (like `page` or `route`) is **not routable**, so components, tests and styles can live next to the route that uses them.

---

## Layouts vs templates

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <div className="flex">
      <Sidebar />          {/* stays mounted between /dashboard/a and /dashboard/b */}
      <main>{children}</main>
    </div>
  )
}
```

| | `layout.tsx` | `template.tsx` |
|---|---|---|
| On navigation between child routes | **Kept** (state, scroll and inputs preserved; not re-rendered) | **Re-mounted** (new instance) |
| Effects | Run once | Re-run on every navigation |
| Use for | Navigation bars, sidebars, providers, shells | Enter animations, per-page analytics, resetting forms |

**Pitfalls:**
- **Don't do auth checks only in a layout.** Layouts don't re-render on client navigation, and they don't stop child segments or Server Actions from running. Check close to the data. (See **Authentication & security**.)
- **Avoid slow `await`s at the top of a high layout.** They block every child route. Push dynamic data down behind `<Suspense>`.

---

## Parallel & intercepting routes

**Parallel routes (`@slot`):** render **several pages in the same layout at the same time**. Each one has its own loading and error states.

```
app/dashboard/
├── layout.tsx            ← receives { children, analytics, team }
├── page.tsx
├── @analytics/page.tsx
├── @analytics/default.tsx   ← required in Next.js 16
├── @team/page.tsx
└── @team/default.tsx
```

```tsx
export default function Layout({ children, analytics, team }: LayoutProps<'/dashboard'>) {
  return <>{children}<section>{analytics}</section><section>{team}</section></>
}
```

**Use for:** dashboards with independent panels, and **conditional UI** (render `@admin` or `@user` based on the role).

**Intercepting routes `(.)folder`:** show another route **inside the current layout** (usually a modal) during client navigation, while a direct visit or a refresh shows the full page.

| Convention | Intercepts |
|---|---|
| `(.)photo` | The same level |
| `(..)photo` | One level up |
| `(..)(..)photo` | Two levels up |
| `(...)photo` | From the `app` root |

**The classic example, a photo modal (like Instagram):** clicking a photo in the feed opens `/photo/123` **as a modal over the feed** (`@modal/(.)photo/[id]/page.tsx`). Sharing or refreshing the URL opens the **full photo page**. The URL is shareable, and Back closes the modal.

---

## Navigation

```tsx
import Link from 'next/link'

<Link href="/products/42">Product</Link>                     // client navigation + automatic prefetching
<Link href={{ pathname: '/search', query: { q: 'shoes' } }}>Search</Link>
<Link href="/dashboard" prefetch={false}>Dashboard</Link>    // disable prefetching
<Link href="/cart" replace scroll={false}>Cart</Link>        // replace history; keep scroll position
```

```tsx
'use client'
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'   // NOT 'next/router'

export function Filters() {
  const router = useRouter()
  const pathname = usePathname()          // '/products'
  const searchParams = useSearchParams()  // read-only URLSearchParams
  const params = useParams()              // { id: '42' } for dynamic segments

  function setSort(sort: string) {
    const next = new URLSearchParams(searchParams)
    next.set('sort', sort)
    router.push(`${pathname}?${next}`)    // also: replace(), back(), refresh(), prefetch()
  }
  …
}
```

**On the server** (Server Components, Server Actions, Route Handlers):

```tsx
import { redirect, permanentRedirect, notFound } from 'next/navigation'

redirect('/login')            // 307 temporary (303 when called from a Server Action)
permanentRedirect('/new-url') // 308 permanent
notFound()                    // 404 + not-found.tsx
```

**`redirect()` works by throwing a special error.** Don't call it inside a `try/catch` that swallows it, and call it **after** the `try/catch` block.

**Config-level redirects and rewrites** (no code needed) go in `next.config.ts`: `redirects()` (changes the URL, 307/308) and `rewrites()` (serves different content **without** changing the URL, e.g. proxying `/api/*` to a backend).

**How client navigation works:**
- `<Link>` **prefetches** routes in the viewport (in production). Next.js 16 deduplicates shared layouts.
- With **Partial Prefetching** (16.3+), Next.js prefetches **one reusable shell per route** instead of one request per link.
- On click, only the changed segments are fetched as an **RSC payload**. Shared layouts are kept, so there's no full page reload.
- **Instant Navigations** (16.3+): routes that stream (`<Suspense>`) or cache (`"use cache"`) show their shell immediately; `export const instant = false` makes a route wait for the server ("block").

---

## Interview Q&A

**Q: What's the difference between `page.tsx` and `layout.tsx`?**
`page` is the unique UI of a route and makes it public. `layout` wraps a segment and its children, persists across navigation without re-rendering, and is shared by all nested routes.

**Q: Layout vs template?**
Both wrap children. A layout keeps its state across navigations; a template re-mounts on every navigation, resetting state and re-running effects.

**Q: How do you handle a 404?**
Call `notFound()` from `next/navigation` (for example when the database returns no record) and add a `not-found.tsx`. Unmatched URLs show the root not-found page.

**Q: What are route groups?**
Folders in parentheses that organise routes or apply different layouts without affecting the URL.

**Q: What are parallel and intercepting routes used for?**
Parallel routes (`@slot`) render several independent pages in one layout (dashboards, conditional role-based UI). Intercepting routes (`(.)`) show a route in the current context, typically a modal with a shareable URL that opens as a full page on refresh.

**Q: Why are `params` Promises?**
So Next.js can start rendering (and prerender the static shell) before request-specific values are known. Next.js 16 removed synchronous access, so you must `await params`.

**Q: `redirect` vs `rewrite`?**
A redirect sends the browser to a new URL (status 307/308). A rewrite serves another path's content while the browser's URL stays the same.

---

## 🎯 Interview answer

> "In the App Router, folders map to URL segments and special files give each segment its UI: `page` makes it routable, `layout` wraps children and persists across navigations, `template` re-mounts on each one, `loading` becomes a Suspense fallback for streaming, `error` is a client error boundary with `retry`, `not-found` pairs with `notFound()`, and `route` defines a Route Handler. Dynamic segments use `[id]`, catch-all `[...slug]` and optional `[[...slug]]`, and in Next.js 16 `params` and `searchParams` are promises I await, validate, and type with `PageProps`; `generateStaticParams` prerenders known values. Route groups and private folders organise code without changing URLs, parallel routes render independent slots, which now each require a `default.js`, and intercepting routes enable modals with shareable URLs. For navigation I use `Link`, with prefetching and only the changed segments fetched as an RSC payload, plus `useRouter`, `usePathname` and `useSearchParams` from `next/navigation` in Client Components, and `redirect`, `permanentRedirect` and `notFound` on the server, keeping `redirect` outside try/catch. I avoid auth checks only in layouts and slow awaits high in the tree, since layouts don't re-render and block their children."
