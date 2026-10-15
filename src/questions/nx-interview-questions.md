## How to use this page

**The most frequently asked Next.js interview questions, with short, correct answers.** They're collected from current interview guides (GreatFrontEnd's mid-to-senior list, PracHub's senior guide, Hyring's top-60 list) and the official Next.js 16 documentation.

- Every topic has a **detailed page** in this section.
- **Senior interviews test judgment more than API recall:** where the server/client boundary goes, how fresh data must be, failure states, security and deployment.
- **Always mention the version:** "In Next.js 16 with Cache Components… in 14/15…"

---

## Fundamentals

**1. What is Next.js?**
A full-stack React framework: file-system routing, server rendering (Server Components, static, dynamic, streaming), data fetching and caching, Server Actions and Route Handlers, plus image, font and metadata optimisations.

**2. Why Next.js over plain React?**
SEO and a fast first load (server HTML), less client JavaScript, server-side data access with secrets, and built-in conventions for routing, layouts, loading and errors.

**3. App Router vs Pages Router?**
The App Router (`app/`) uses Server Components, nested layouts, streaming, Server Actions and the Metadata API. The Pages Router (`pages/`) uses `getStaticProps` / `getServerSideProps`, `_app` and API routes. The App Router is recommended for new projects.

**4. How does file-system routing work?**
Folders are URL segments; `page.tsx` makes a segment routable; `[id]`, `[...slug]` and `[[...slug]]` are dynamic; `(group)` and `_private` folders don't affect the URL.

**5. `page.tsx` vs `layout.tsx`?**
`page` is the unique UI of a route. `layout` wraps a segment and its children and persists across navigation without re-rendering.

**6. Layout vs template?**
A template re-mounts on every navigation (fresh state, effects re-run); a layout keeps its state.

**7. What are Server Components?**
Components that run only on the server, can be async and access data or secrets directly, and ship no JavaScript. They're the default in the App Router.

**8. What does `"use client"` do?**
It marks a client boundary: that module and its imports are bundled for the browser, server-rendered for the first HTML, then hydrated. It's needed for state, effects, event handlers and browser APIs.

**9. Can a Client Component render a Server Component?**
It can't import one, but it can render Server Components passed as `children` or props.

**10. What is hydration, and what causes hydration errors?**
Hydration attaches React to server-rendered HTML. Errors happen when the first client render differs: time or random values, `window` checks or `localStorage` during render, invalid HTML nesting, browser extensions.

---

## Rendering & caching

**11. What rendering strategies does Next.js support?**
Static generation, ISR, request-time (SSR), streaming, Partial Prerendering (a static shell + dynamic streaming, the default with Cache Components), and client-side rendering in Client Components.

**12. SSG vs SSR?**
SSG builds HTML once at build time (fast, served from a CDN). SSR builds it per request (fresh and personalised, but slower and costlier).

**13. What is ISR?**
Static pages regenerated after a lifetime or on demand, with stale-while-revalidate behaviour.

**14. What is Partial Prerendering?**
A prerendered static shell (static + cached content + Suspense fallbacks) served instantly, with dynamic parts streamed in the same response. It avoids the all-static or all-dynamic choice.

**15. Is `fetch` cached by default?**
Next.js 14: yes. 15: no. 16 with Cache Components: nothing is cached unless you use `"use cache"`.

**16. How does `"use cache"` work?**
It caches an async function, component or file. Arguments and closures form the key, `cacheLife` sets the stale, revalidate and expire times, and `cacheTag` enables targeted invalidation.

**17. `revalidateTag` vs `updateTag` vs `revalidatePath`?**
`revalidateTag(tag, 'max')`: stale-while-revalidate (eventual consistency). `updateTag(tag)`: read-your-writes, in Server Actions only. `revalidatePath`: invalidates a path.

**18. What caching layers exist?**
Request memoisation (`React.cache` / `fetch` dedupe), the data / `"use cache"` cache, prerendered routes (the static shell), the client router cache, the CDN and the browser cache.

**19. What does `generateStaticParams` do?**
It returns the dynamic segment values to prerender at build time.

**20. What is streaming and how does Suspense enable it?**
The server sends HTML in chunks: the shell first, then each `<Suspense>` boundary when its data is ready. `loading.tsx` wraps a page in Suspense automatically.

---

## Data, mutations & APIs

**21. How do you fetch data in a Server Component?**
`async` component + `await` a server-only data layer (ORM, database, `fetch`), with auth checks and minimal DTOs.

**22. What are request waterfalls?**
Independent requests running sequentially. Fix them with `Promise.all`, separate Suspense boundaries, no slow awaits in layouts, and preloading.

**23. When should you fetch on the client?**
For polling, infinite scroll, live updates, and some highly interactive UI, often seeded with server data.

**24. What are Server Actions?**
`"use server"` async functions callable from forms and components, exposed as encrypted POST endpoints, with revalidation and redirects in one round trip.

**25. How do you secure a Server Action?**
Treat it as a public endpoint: authenticate, authorise the specific resource, validate with zod, return minimal data, and rate-limit.

**26. What are Route Handlers? When would you use them instead of Server Actions?**
`route.ts` files with `GET`/`POST`… handlers using Web Request/Response. Use them for webhooks, mobile and third-party clients, public APIs, streaming and downloads.

**27. What is Proxy (Middleware)?**
`proxy.ts` (renamed in Next.js 16, running on Node.js) runs before requests to redirect, rewrite, set headers or cookies, or respond early. It's for lightweight, optimistic logic only.

**28. Redirect vs rewrite?**
A redirect changes the URL (307/308); a rewrite serves other content at the same URL.

**29. Where should secrets live?**
In server-only env vars, read in the server data layer. `NEXT_PUBLIC_` variables are public and inlined at build time.

**30. How do you read cookies and headers?**
`await cookies()` and `await headers()` from `next/headers` (async since Next.js 15, required in 16). Set cookies only in Server Actions and Route Handlers.

---

## Performance, security & deployment

**31. Why use `next/image`?**
Resizing, AVIF/WebP, `srcset`, lazy loading, CLS prevention and caching. Use `preload` for the LCP image (`priority` is deprecated in 16).

**32. How does `next/font` work?**
It self-hosts fonts at build time with size-adjusted fallbacks: no third-party requests, no layout shift.

**33. How do you add SEO metadata?**
`metadata` / `generateMetadata`, `sitemap.ts`, `robots.ts`, `opengraph-image`, canonical URLs, JSON-LD and correct status codes.

**34. How do you implement authentication?**
Server Actions or an auth library, an HttpOnly session cookie, a server-only DAL with a cached `verifySession()` checked in pages, every Action and every Route Handler, plus optional optimistic Proxy redirects.

**35. Why isn't middleware/Proxy enough for auth?**
It should stay fast (no database checks), layouts don't re-check, and CVE-2025-29927 showed middleware can be bypassed. Authorise near the data.

**36. Node.js vs Edge runtime?**
Node.js by default (full APIs; required by Cache Components; used by `proxy.ts`). Edge only for small, latency-critical code with checked constraints.

**37. How do you deploy outside Vercel?**
`next start` on Node.js or Docker (`output: 'standalone'`) behind a reverse proxy and CDN, or via an adapter / OpenNext.

**38. What breaks with multiple instances?**
Per-instance caches (use a shared handler and tag sync), Server Action keys (`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`), version skew (`deploymentId`), and stream buffering.

**39. What is Turbopack?**
The Rust-based incremental bundler, default in Next.js 16 for dev and build (2–5× faster builds). It replaces webpack (`--webpack` opts out).

**40. What's new in Next.js 16?**
Cache Components (`"use cache"`, PPR), `proxy.ts`, Turbopack by default, async request APIs only, `updateTag`/`refresh`, React Compiler support, and Node 20.9+. Then 16.3 (Instant Navigations, Partial Prefetching) and 16.4 (Cache Components recommended and on in new apps, `ensureStatic`).

---

## Scenario questions

**"Build `/products/[id]`."**
- **Route:** `app/products/[id]/page.tsx`, with `await params`, validating the ID.
- **Data:** a `getProduct` function with `React.cache` (shared with `generateMetadata`) and `"use cache"` + `cacheTag('product-'+id)`.
- **Missing data:** `notFound()` for unknown IDs.
- **Prerendering:** `generateStaticParams` for top sellers.
- **Streaming:** price and stock streamed behind `<Suspense>`.
- **Client:** `<AddToCart>` as a small Client Component calling a secured, idempotent Server Action.
- **Media and SEO:** `preload` on the hero image, JSON-LD, and `revalidateTag` from a CMS webhook.

**"Why is this page stale?"**
- Name the version and model.
- Find the stale layer: the database, the server cache, the static shell, the client router cache, the CDN or the browser.
- Check that tags match between `cacheTag` and the invalidation, and that invalidation runs after the commit and that the webhook arrives.
- **With multiple instances:** use a shared cache handler + `refreshTags`.
- Fix the invalidation path, don't just purge.

**"Protect `/dashboard`."**
- An optimistic Proxy redirect if there's no session cookie.
- `verifySession()` in the DAL for the page's data.
- **Every Server Action and Route Handler re-checks auth and ownership.**
- No auth logic only in the layout; DTOs for the props.
- `forbidden()` is still experimental, so return or redirect explicitly.

**"Add a cart button to a product page."**
- Keep the page a Server Component.
- Create `"use client"` `<AddToCartButton productId>` with `useOptimistic` or a pending state.
- It calls a Server Action that validates, authenticates, writes idempotently, and then calls `updateTag('cart-'+userId)`.

**"Why did hydration fail?"**
- Reproduce it with the dev overlay diff.
- Look for `Date`, `Math.random` or locale formatting in render, `window` checks, invalid nesting, extension attributes.
- Fix it with effects, server-computed values, valid HTML, or `suppressHydrationWarning` for unavoidable timestamps.

**"Design a personalised commerce page."**
- **Shared content:** cache the product description and images with product tags in the static shell.
- **Personalised content:** stream the price, eligibility, cart and recommendations behind focused Suspense boundaries, reading cookies outside the cache.
- **Purchase:** a small client purchase control calling an idempotent, authorised Server Action.
- **Invalidation:** `updateTag` for the user's cart, `revalidateTag` for inventory.
- **Monitoring:** cache hit rate, action failures, hydration errors.
- **Multi-instance:** a shared cache and encryption keys, and no stream buffering.

---

## Senior red flags

**Answers that interviewers count against you:**

- ❌ `"use client"` on the root layout or whole pages.
- ❌ "Server Actions are secure because they use `use server`."
- ❌ Calling all caching "ISR", or saying "fetch is cached by default" without naming the version.
- ❌ Auth only in middleware/Proxy, or only in a layout.
- ❌ Choosing the Edge runtime for "speed" without checking its constraints.
- ❌ `revalidatePath('/')` (invalidating everything) after every write.
- ❌ Caching per-user data in a shared cache, ignoring cardinality and privacy.
- ❌ Treating Suspense as just a spinner API, instead of a streaming and layout boundary.
- ❌ Assuming a successful local build proves multi-instance correctness.
- ❌ Server Components calling the app's own `/api` routes.
- ❌ Secrets in `NEXT_PUBLIC_` variables.

**A good answer pattern** (from GreatFrontEnd's guide): name the **route or boundary**, the **freshness requirement**, the **server/client split**, the **Next.js API** you'd use, and **one failure mode** you'd handle.

---

## 🎯 Interview answer

> "When I'm asked about Next.js, I anchor on version and judgment. I'm on Next.js 16, where Cache Components is recommended since 16.4 and becomes the default in 17, and I know how 14 and 15 differed. My defaults are to keep the tree as Server Components and push `use client` to small interactive leaves; to fetch in a server-only data access layer that authorises and returns DTOs, in parallel and streamed behind Suspense; to cache explicitly with `use cache`, `cacheLife` and domain `cacheTag`s; and to invalidate with `updateTag` for read-your-writes or `revalidateTag` for stale-while-revalidate after the write commits. Mutations go through validated, authorised and idempotent Server Actions, while Route Handlers serve webhooks and external clients, and Proxy only does optimistic redirects and headers, since auth belongs near the data, as CVE-2025-29927 showed. I use `next/image` with `preload`, `next/font` and the Metadata API for performance and SEO, and when deploying multiple instances I plan for a shared cache with tag coordination, a shared action encryption key, a deployment ID for version skew, and unbuffered streaming. For any design question I state the route boundary, freshness need, server/client split, the API and a failure mode."
