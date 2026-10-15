## Quick answer

**The Pages Router (`pages/` folder) is the original Next.js routing system.** It's still supported and very common in existing company codebases.
- Every file in `pages/` is a route, and every page is a **Client Component** that is server-rendered and then hydrated.
- Data comes from special functions: **`getStaticProps`** (build time), **`getStaticPaths`** (which dynamic pages to build) and **`getServerSideProps`** (every request).
- Global setup lives in `_app.tsx` and `_document.tsx`, and APIs live in `pages/api`.

**Migrating to the App Router is incremental.** Both routers can run in the same app, so you move **route by route**, starting with simple, low-risk pages.

---

## Pages Router essentials

```tsx
// pages/products/[id].tsx
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import Head from 'next/head'

export const getStaticPaths: GetStaticPaths = async () => {
  const ids = await getTopProductIds()
  return {
    paths: ids.map((id) => ({ params: { id } })),
    fallback: 'blocking',              // unknown ids: render on first request, then cache
  }
}

export const getStaticProps: GetStaticProps<{ product: Product }> = async ({ params }) => {
  const product = await getProduct(params!.id as string)
  if (!product) return { notFound: true }
  return { props: { product }, revalidate: 60 }        // ISR: regenerate at most every 60 s
}

export default function ProductPage({ product }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head><title>{product.title}</title></Head>
      <h1>{product.title}</h1>
    </>
  )
}
```

```tsx
// request-time rendering
export const getServerSideProps: GetServerSideProps = async ({ req, params, query }) => {
  const session = await getSession(req)
  if (!session) return { redirect: { destination: '/login', permanent: false } }
  return { props: { orders: await getOrders(session.userId) } }
}
```

| Function | Runs | Returns |
|---|---|---|
| `getStaticProps` | At **build time** (and on revalidation) | `{ props, revalidate?, notFound?, redirect? }` |
| `getStaticPaths` | At build time, for dynamic routes | `{ paths, fallback: false \| true \| 'blocking' }` |
| `getServerSideProps` | On **every request** | `{ props, notFound?, redirect? }` |
| `getInitialProps` | Legacy (server + client) | Avoid in new code |

**`fallback` options:**
- `false`: unknown paths give a 404.
- `true`: shows a fallback UI (`router.isFallback`), then the page.
- `'blocking'`: server-renders on the first request, with no fallback UI.

**Other Pages Router pieces:**
- `pages/_app.tsx`: global layout, providers and CSS (it wraps every page).
- `pages/_document.tsx`: customises `<html>` and `<body>` (server only).
- `pages/api/*.ts`: API routes with `(req, res)` handlers.
- `next/router`: `useRouter()` with `query`, `push`, `events`.
- `next/head`: metadata.
- On-demand ISR: `res.revalidate('/path')` inside an API route.

---

## Mapping to the App Router

| Pages Router | App Router |
|---|---|
| `pages/about.tsx` | `app/about/page.tsx` |
| `pages/blog/[slug].tsx` | `app/blog/[slug]/page.tsx` |
| `pages/_app.tsx` + `pages/_document.tsx` | `app/layout.tsx` (root layout with `<html>`/`<body>`) + a client `Providers` component |
| Per-page layouts (`getLayout` pattern) | Nested `layout.tsx` files |
| `getStaticProps` | An `async` Server Component with cached data (`"use cache"` + `cacheLife`; or `fetch` cache options in the previous model) |
| `getStaticProps` + `revalidate: 60` | `cacheLife(...)` / `revalidateTag`; previously `export const revalidate = 60` |
| `getStaticPaths` | `generateStaticParams` |
| `fallback: 'blocking'` | The default behaviour for unknown params (`dynamicParams = true`) / App Shell + ISR with Cache Components |
| `getServerSideProps` | A dynamic Server Component (reads `cookies()`, `headers()`, uncached data) behind `<Suspense>` |
| `{ notFound: true }` / `{ redirect }` | `notFound()` / `redirect()` from `next/navigation` |
| `pages/api/x.ts` (`req, res`) | `app/api/x/route.ts` (`GET`/`POST` with `Request`/`Response`), or **Server Actions** for UI mutations |
| `next/router` (`useRouter`, `router.query`) | `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`, `useParams`) |
| `next/head` | `metadata` / `generateMetadata` |
| `router.events` (route change events) | `usePathname` / `useSearchParams` in an effect |
| `_error.tsx`, `404.tsx` | `error.tsx`, `global-error.tsx`, `not-found.tsx` |
| Middleware | `proxy.ts` (Next.js 16) |

---

## Migration strategy

1. **Upgrade Next.js first** (with codemods: `npx @next/codemod@canary upgrade latest`) and fix deprecations, while still on the Pages Router.
2. **Create `app/layout.tsx`** (the root layout) and move global CSS and providers into a client `Providers` component.
3. **Migrate route by route.** Both routers coexist: `app/` and `pages/` can't define the **same** route, but different routes can live in each.
   - **Start with simple, non-critical, mostly static pages** (about, docs, marketing), then lists, then complex authenticated flows.
4. **For each page:**
   - Turn the data function into an `async` Server Component.
   - Move interactive parts into `"use client"` components.
   - Replace `next/router` with `next/navigation`, and `next/head` with `metadata`.
5. **Watch the gotchas:**
   - Many libraries need a `"use client"` wrapper.
   - Context providers must be Client Components.
   - `router.query` → `useSearchParams` / `params` (Promises, awaited, in Next.js 16).
   - **Navigating between the two routers is a hard navigation** (a full page load), so group related pages together.
   - Caching behaviour differs: decide on Cache Components early.
6. **Move API routes when it helps:** keep `pages/api` working, add Route Handlers for new endpoints, and replace UI-only mutations with Server Actions.
7. **Measure every step:** Core Web Vitals, bundle size, error rates, SEO (status codes, canonical URLs, sitemap), behind feature flags or route-level rollout where possible.

---

## Interview Q&A

**Q: What do `getStaticProps` and `getServerSideProps` do?**
`getStaticProps` fetches data at build time (with optional `revalidate` for ISR); `getServerSideProps` runs on every request. Both pass props to a page in the Pages Router.

**Q: What is `getStaticPaths` and what does `fallback` mean?**
It lists which dynamic pages to prebuild. `fallback` controls unknown paths: `false` = 404, `true` = fallback UI then the page, `'blocking'` = server-render on first request.

**Q: How would you migrate a large app from the Pages Router to the App Router?**
Incrementally: upgrade first, add a root layout, then move routes one at a time from simple static pages to complex ones, converting data functions to Server Components and interactive parts to Client Components, and replacing `next/router` and `next/head`, measuring performance and SEO at each step.

**Q: Can both routers run in the same app?**
Yes, for different routes. Navigation between them is a full page load, and the same route can't exist in both.

---

## 🎯 Interview answer

> "In the Pages Router, every file in `pages` is a route rendered as a Client Component. Data comes from `getStaticProps` at build time, optionally with `revalidate` for ISR, `getStaticPaths` with a `fallback` mode for dynamic pages, and `getServerSideProps` per request, while `_app` and `_document` handle global setup and `pages/api` handles endpoints. In the App Router those map to async Server Components with `use cache` or fetch caching, `generateStaticParams`, dynamic Server Components behind Suspense, nested layouts, `notFound()` and `redirect()`, Route Handlers or Server Actions, `next/navigation` and the Metadata API. I'd migrate incrementally, since both routers coexist for different routes: upgrade Next.js and run codemods first, add a root layout with a client Providers component, then move routes one at a time, starting with simple static pages and leaving complex authenticated flows for later. For each page I turn the data function into a Server Component, push interactivity into `use client` components, and replace router and head APIs, while watching for libraries that need client wrappers, async params in Next.js 16, the hard navigation between routers, and different caching. I measure Web Vitals, bundle size, errors and SEO at each step."
