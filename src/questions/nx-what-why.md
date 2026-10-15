## Quick answer

**Next.js is a full-stack React framework.** React is a library for building UI; Next.js adds everything a real app needs around it:

- **File-system routing:** folders become URLs.
- **Server rendering:** Server Components, SSR, static generation, streaming.
- **Data fetching, caching and mutations:** `"use cache"`, Server Actions.
- **Backend endpoints:** Route Handlers, plus Proxy (formerly Middleware).
- **Built-in optimisations:** images, fonts, scripts, metadata/SEO, code splitting.
- **Tooling:** Turbopack (the default bundler), TypeScript, a dev server and production builds.

**Current version: Next.js 16** (16.4 at the time of writing). It uses the **App Router** (`app/` folder), built on **React Server Components**. The older **Pages Router** (`pages/` folder) is still supported.

---

## Next.js vs plain React

| | **Plain React** (Vite SPA) | **Next.js** |
|---|---|---|
| Rendering | **Client-side only (CSR):** the browser downloads JavaScript, then renders | **Server-first:** HTML from the server (static or dynamic), then hydrated. CSR still possible where needed. |
| Routing | Add a library (React Router) | **Built in**, file-based, with nested layouts |
| SEO / first paint | Weaker: content appears after JavaScript runs | **Strong:** real HTML on the first response |
| Data fetching | `useEffect` / TanStack Query in the browser | **Directly in Server Components** (`await db.query()`), cached or streamed |
| Backend | A separate server (Express, Fastify…) | **Route Handlers** and **Server Actions** in the same project |
| Secrets | Can't use them in the browser at all | Server Components and Actions can use secrets safely |
| Bundle size | All UI code goes to the browser | **Server Components send zero JavaScript** |
| Hosting | Any static host (S3, Netlify, GitHub Pages) | A Node.js server, Vercel or other platforms, Docker, or a static export (with limits) |
| Complexity | Simpler mental model | More concepts: server/client boundaries, caching, runtimes |

**When to choose Next.js:** public websites that need SEO and fast first loads (e-commerce, marketing, content, blogs), full-stack apps where one team owns the frontend and the backend-for-frontend, and apps that benefit from server data access.

**When a Vite SPA can be enough:** internal tools and dashboards behind a login, where SEO doesn't matter and there's already a separate API.

---

## App Router vs Pages Router

| | **App Router** (`app/`) | **Pages Router** (`pages/`) |
|---|---|---|
| Since | Next.js 13 (stable 13.4); the recommended default | Next.js 1–12; still supported |
| Components | **Server Components by default**; `"use client"` for interactive parts | Every page is a Client Component (rendered on the server, then hydrated) |
| Layouts | **Nested layouts** (`layout.tsx` per folder) that keep their state on navigation | A single `_app.js` + per-page layout patterns |
| Data fetching | `async` components, `fetch` / database calls, `"use cache"` | `getStaticProps`, `getServerSideProps`, `getStaticPaths` |
| Loading / errors | `loading.tsx`, `error.tsx`, `not-found.tsx` per segment, plus Suspense streaming | Manual |
| Mutations | **Server Actions** | API routes (`pages/api`) |
| Metadata | `metadata` / `generateMetadata` exports | `next/head` |

**Both can run in the same app during a migration**, route by route. (See **Pages Router & migrating to the App Router**.)

---

## How a request works

```
Browser ── GET /products/42 ──▶ proxy.ts (optional: redirects, rewrites, headers)
                                   │
                                   ▼
                     app/products/[id]/page.tsx  (+ layouts above it)
                                   │  Server Components run on the server:
                                   │  await getProduct(42)  ← cached ("use cache") or at request time
                                   ▼
             HTML (static shell + streamed parts)  +  RSC payload (serialised component tree)
                                   │
Browser ◀──────────────────────────┘
  1. shows the HTML immediately (fast LCP, SEO)
  2. downloads JavaScript ONLY for Client Components ("use client")
  3. hydrates them, so buttons and forms become interactive
  4. later navigations (<Link>): fetch only the RSC payload of the new page, no full reload
```

---

## What's new in Next.js 16

**Interviewers increasingly ask "what changed?". Know these** (from the official release posts):

| Area | Change |
|---|---|
| **Caching** | **Cache Components** (`cacheComponents: true`): **dynamic by default**, and **caching is opt-in** with `"use cache"`, `cacheLife` and `cacheTag`. Partial Prerendering (PPR) is the default with it. **16.4: recommended for every app and enabled in new `create-next-app` projects; it becomes the default in Next.js 17.** |
| **Caching APIs** | `revalidateTag(tag, profile)` now takes a `cacheLife` profile (stale-while-revalidate); new **`updateTag()`** (read-your-writes in Server Actions) and **`refresh()`** |
| **Proxy** | **`middleware.ts` renamed to `proxy.ts`** (function `proxy`), running on the **Node.js runtime**. `middleware.ts` is deprecated (kept for the Edge runtime only). |
| **Bundler** | **Turbopack is the default** for `next dev` and `next build` (2–5× faster builds). Use `--webpack` to opt out. |
| **React** | React 19.2+ features (View Transitions, `useEffectEvent`, `<Activity>`); **16.4 ships React 19.3**. Built-in **React Compiler** support (`reactCompiler: true`, stable, off by default). |
| **Async request APIs** | `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` **must be awaited** (sync access removed) |
| **Routing** | Rewritten prefetching (layout deduplication, incremental prefetch); **parallel route slots need `default.js`**. 16.3: **Instant Navigations** and **Partial Prefetching** (one reusable shell prefetched per route). |
| **Removals** | AMP, the `next lint` command (use ESLint or Biome directly), `serverRuntimeConfig` / `publicRuntimeConfig` (use env vars), `experimental.ppr` |
| **`next/image`** | `priority` deprecated in favour of **`preload`**; new defaults (`qualities: [75]`, a 4-hour `minimumCacheTTL`); `images.domains` deprecated in favour of `remotePatterns` |
| **Requirements** | **Node.js 20.9+**, TypeScript 5.1+ |
| **Errors** | `error.js` gets a `retry()` prop (stable in 16.3); new **`catchError()`** for component-level error boundaries |
| **Deployment** | A stable **Adapter API** (16.2) for running Next.js on other platforms |

**Always ask which version a team uses.** Many company codebases still run Next.js 14 or 15, where caching works differently. (See **Caching in Next.js**.)

---

## Project structure

```
my-app/
├── app/                      ← App Router: routes live here
│   ├── layout.tsx            ← root layout (<html>, <body>), required
│   ├── page.tsx              ← "/"
│   ├── globals.css
│   ├── (marketing)/about/page.tsx    ← "/about" (route group: folder not in the URL)
│   ├── products/
│   │   ├── page.tsx          ← "/products"
│   │   └── [id]/
│   │       ├── page.tsx      ← "/products/42"
│   │       ├── loading.tsx   ← streaming fallback
│   │       └── error.tsx     ← error boundary
│   └── api/webhooks/route.ts ← Route Handler: POST /api/webhooks
├── components/               ← shared UI (not routes)
├── lib/                      ← data access layer, utils ("server-only" where needed)
├── public/                   ← static files served as-is (/logo.svg)
├── proxy.ts                  ← request interception (optional)
├── next.config.ts            ← framework configuration
└── .env.local                ← secrets (never committed)
```

**Scripts:** `next dev` (Turbopack dev server), `next build` (production build), `next start` (run the production server).

---

## Interview Q&A

**Q: What is Next.js, and how is it different from React?**
React is a UI library. Next.js is a framework built on React that adds routing, server rendering (Server Components, SSR, SSG, streaming), data fetching and caching, Server Actions and Route Handlers, and built-in optimisations, so you can build full-stack apps with good SEO and performance.

**Q: Why would you choose Next.js over a plain React SPA?**
For SEO and fast first loads (real HTML from the server), less client JavaScript (Server Components), secure server-side data access in the same codebase, and built-in conventions for routing, layouts, loading and error states.

**Q: App Router or Pages Router for a new project?**
The App Router. It's the recommended model with Server Components, nested layouts, streaming, Server Actions and Cache Components. The Pages Router is for existing apps, which can migrate incrementally.

**Q: What are the biggest changes in Next.js 16?**
Cache Components with opt-in `"use cache"` caching and Partial Prerendering, `proxy.ts` replacing middleware, Turbopack as the default bundler, required async request APIs, new caching APIs (`updateTag`, `refresh`, and `revalidateTag` with a profile), and React Compiler support.

---

## 🎯 Interview answer

> "Next.js is a full-stack React framework. React gives you components; Next.js adds file-based routing with nested layouts, server rendering through React Server Components with static generation, request-time rendering and streaming, data fetching and caching, Server Actions for mutations, Route Handlers for APIs, Proxy for request interception, and built-in image, font, script and metadata optimisations, all bundled by Turbopack. Compared with a Vite SPA, the browser gets real HTML immediately, which is better for SEO and LCP, Server Components ship no JavaScript, and secrets and database access stay on the server; the trade-off is more concepts, like server/client boundaries and caching, and a server to host. For new projects I use the App Router. On Next.js 16, I'd highlight Cache Components, which makes the app dynamic by default with explicit `use cache` caching and Partial Prerendering, recommended for all apps since 16.4 and the default in 17; `proxy.ts` replacing middleware; Turbopack by default; async `params` and `cookies`; and the new caching APIs `updateTag` and `refresh`. I always check which version a codebase runs, because caching behaviour differs between 14, 15 and 16."
