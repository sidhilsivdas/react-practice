## 📄 Original answer (PDF)

**Question:** When migrating an SPA to Server-Side Rendering (SSR), what architectural challenges do you anticipate and how do you solve them?

**Answer:** Challenges include window/document object absence on the server, hydration mismatches, and increased server CPU load. I solve this by wrapping browser-specific logic in `useEffect` or dynamic imports with `ssr: false`, strictly matching server/client initial state, and implementing robust caching layers (Redis/CDN) to offload CPU.

**Real-time example:** Moving a React SPA to Next.js; discovering that a third-party carousel library relies on `window.innerWidth` on load, causing the server build to crash until isolated to the client.

---

## 💡 Browser-only code

```tsx
// ❌ crashes on the server: "ReferenceError: window is not defined"
const width = window.innerWidth

// ✅ 1. run it after mount
const [width, setWidth] = useState<number | null>(null)
useEffect(() => setWidth(window.innerWidth), [])

// ✅ 2. load the whole component only in the browser
'use client'                                          // ⚠️ App Router: must be in a CLIENT component
import dynamic from 'next/dynamic'
const Carousel = dynamic(() => import('./Carousel'), { ssr: false, loading: () => <CarouselSkeleton /> })
```

**Updated for the App Router:** `next/dynamic(..., { ssr: false })` **isn't allowed in Server Components**. Put it in a file marked `'use client'`.

**Also watch for:** `localStorage`, `navigator`, `document.cookie`, and libraries that touch them at import time (charts, maps, editors, analytics SDKs).

---

## 💡 Hydration mismatches

**Hydration** = React attaches to server HTML and expects the **first client render to produce the same markup**.

| Common cause | Fix |
|---|---|
| `Date.now()`, `Math.random()`, `new Date().toLocaleString()` in render | Compute on the server and pass as a prop, or render it after mount |
| Different locale or timezone on server vs browser | Format with an explicit locale and timezone, or format on the client after mount |
| Reading `localStorage` / `window` during render | Read in `useEffect`, and render a neutral first state |
| Invalid HTML nesting (`<div>` inside `<p>`, nested `<a>`) | Fix the markup; the browser "repairs" it differently from React |
| Browser extensions changing the DOM | `suppressHydrationWarning` only on known-safe spots (e.g. a `<body>` attribute) |

React 19 / Next.js show a **diff of what didn't match**, which makes these much easier to track down.

---

## 💡 Other challenges

| Challenge | Solution |
|---|---|
| **Server CPU & TTFB** | Don't SSR everything: static or ISR / `"use cache"` for cacheable pages, a CDN in front, Redis for API data, streaming with Suspense |
| **Data fetching moves to the server** | Replace `useEffect` fetching with server components or loaders; avoid waterfalls (`Promise.all`) |
| **Auth** | Session in HttpOnly cookies, readable on the server; no tokens in localStorage (the server can't read them) |
| **Global singletons leaking between users** | Create the store or cache **per request** (e.g. `makeStore()`), never a module-level user store on the server |
| **Environment variables** | Separate server-only secrets from public `NEXT_PUBLIC_*` variables |
| **Third-party scripts** | `next/script` with the right strategy; analytics run only on the client |
| **SEO & routing** | Metadata per page, redirects for old SPA hash routes (`/#/product/1` → `/product/1`) |
| **Infrastructure** | Node servers to run, scale and monitor (or a platform like Vercel); health checks, graceful shutdown |

---

## 💡 Migrating safely

**Migrate incrementally, not as a big bang:**

1. **Get the SPA running inside Next.js first** (a catch-all client route), so nothing changes for users.
2. **Move the highest-value pages first** (SEO landing pages, product pages) to server rendering.
3. **Measure:** TTFB, LCP and server CPU before and after, using RUM.
4. **Run old and new behind a routing layer or feature flags.** Roll back per route if needed.

---

## 🎯 Interview answer

> "The main challenges are browser APIs not existing on the server, hydration mismatches, server load, and moving data fetching and auth to the server. Browser-only code goes into effects or into client-only dynamic imports; in the App Router, `ssr: false` must live in a client component. Hydration mismatches usually come from non-deterministic render values like dates, random numbers and locales, from reading localStorage during render, or from invalid HTML nesting, so I make the first client render match the server and move browser-dependent values after mount. To control server cost I don't SSR everything: static, ISR or cached pages where possible, a CDN in front, Redis for API data, and streaming with Suspense so the shell is fast. I also make stores per request to avoid leaking data between users, move auth to HttpOnly cookies, separate server and public environment variables, and redirect old SPA routes. Finally, I migrate incrementally, page by page, measuring TTFB, LCP and CPU as I go."
