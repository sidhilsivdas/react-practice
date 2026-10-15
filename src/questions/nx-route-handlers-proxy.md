## Quick answer

- **Route Handlers (`app/**/route.ts`)** are HTTP endpoints built on the Web `Request` / `Response` APIs. Export functions named after HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`…). Use them for **webhooks, public APIs, mobile clients, file downloads and OAuth callbacks**.
- **Proxy (`proxy.ts`, called `middleware.ts` before Next.js 16)** runs **before** a request reaches a route. It can **redirect, rewrite, set headers and cookies, or respond directly**. In Next.js 16 it runs on the **Node.js runtime**.
- **Proxy is for lightweight, optimistic checks** (redirects, A/B tests, locale, a quick auth cookie check). It's **not a full authorisation layer** and **not for slow data fetching**.

---

## Route Handlers

```ts
// app/api/products/route.ts → GET /api/products, POST /api/products
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''           // query string
  const products = await searchProducts(q)
  return NextResponse.json(products, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}

const Body = z.object({ title: z.string().min(1), price: z.number().positive() })

export async function POST(request: NextRequest) {
  const session = await verifySession()                          // public endpoint: check auth
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Body.safeParse(await request.json())            // validate the body
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 })

  const product = await createProduct(parsed.data, session.userId)
  return NextResponse.json(product, { status: 201 })
}
```

**Dynamic segments:**

```ts
// app/api/products/[id]/route.ts
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params                                 // a Promise, like in pages
  const product = await getProduct(id)
  if (!product) return new Response('Not found', { status: 404 })
  return Response.json(product)
}
```

**Facts to know:**
- **`route.ts` can't be in the same folder as `page.tsx`.**
- **Caching:** in Next.js 15+, `GET` handlers are **not cached by default**. With Cache Components, `GET` handlers follow the same prerendering model as pages (static unless they use request-time data; `"use cache"` inside works too).
- **Cookies and headers:** `request.cookies`, `request.headers`, or `await cookies()` / `await headers()`. **Setting** cookies works here and in Server Actions.
- **Streaming responses:** return a `ReadableStream` (AI token streaming, Server-Sent Events, large CSV exports).
- **CORS** isn't automatic: set `Access-Control-Allow-*` headers and handle `OPTIONS` (see **CORS, cookies & security headers**).

**A webhook with signature verification** (a classic use case):

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()                               // RAW body: needed for the signature
  const signature = request.headers.get('stripe-signature')!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }
  if (await alreadyProcessed(event.id)) return new Response('OK')    // providers retry: deduplicate
  await handleEvent(event)
  return new Response('OK')
}
```

---

## Proxy (formerly Middleware)

```ts
// proxy.ts: in the project root (or src/), next to app/
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {          // or: export default function proxy(...)
  const { pathname } = request.nextUrl

  // 1. optimistic auth redirect: only checks that a session COOKIE exists
  if (pathname.startsWith('/dashboard') && !request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. A/B test: rewrite (the URL stays the same, different content is served)
  if (pathname === '/pricing') {
    const bucket = request.cookies.get('ab-pricing')?.value ?? (Math.random() < 0.5 ? 'a' : 'b')
    const response = NextResponse.rewrite(new URL(`/pricing/${bucket}`, request.url))
    response.cookies.set('ab-pricing', bucket, { maxAge: 60 * 60 * 24 * 30 })
    return response
  }

  // 3. add headers to every response
  const response = NextResponse.next()
  response.headers.set('x-request-id', crypto.randomUUID())
  return response
}

// run Proxy only on matching paths (skip static files and images)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
```

**`NextResponse` methods:**

| Method | Effect |
|---|---|
| `NextResponse.next()` | Continue to the route (optionally with modified request or response headers) |
| `NextResponse.redirect(url)` | Send the browser to another URL (307 by default) |
| `NextResponse.rewrite(url)` | Serve another path's content **without changing the URL** |
| `NextResponse.json(data, { status })` / `new Response(...)` | Respond directly, e.g. `401` for blocked API calls |

**Next.js 16 changes:**
- **Rename `middleware.ts` → `proxy.ts`** and the exported function → **`proxy`**. The logic stays the same. A codemod is available.
- **`proxy.ts` runs on the Node.js runtime.** `middleware.ts` still exists for **Edge runtime** use cases, but it's **deprecated**.
- **Why the rename:** "middleware" suggested Express-style middleware chains. "Proxy" makes clear it's a **network boundary in front of the app**, not where business logic belongs.
- Only **one** `proxy.ts` per project; split the logic into imported modules.

---

## What Proxy should and shouldn't do

| ✅ Good for | ❌ Not for |
|---|---|
| Redirects based on the request (old URLs, locale detection from `Accept-Language`, geo) | **Full authorisation:** check permissions in the data layer, Server Components, Actions and Route Handlers too |
| Rewrites: A/B tests, multi-tenant subdomains (`acme.app.com` → `/tenants/acme`), feature flags | **Slow work:** database queries, external API calls (it runs on **every matched request, including prefetches**) |
| **Optimistic** auth checks (does a session cookie exist?) to redirect quickly | Data fetching for pages (`fetch` cache options have no effect in Proxy) |
| Setting security headers, CSP nonces, request IDs, bot blocking | Heavy dependencies that slow down every request |

**Simple redirects without logic?** Use `redirects()` in `next.config.ts` instead. It's faster and declarative.

---

## Why Proxy isn't enough for auth

**CVE-2025-29927 (March 2025, CVSS 9.1):**
- **What happened:** attackers could **skip middleware entirely** by sending a spoofed internal header (`x-middleware-subrequest`). Apps that did **all their authorisation in middleware** were fully exposed.
- **Who was affected:** mainly **self-hosted** deployments.
- **Fixed in:** 12.3.5, 13.5.9, 14.2.25 and 15.2.3.

**The lesson interviewers want to hear: defence in depth.** Proxy can do a fast optimistic redirect, but **every Server Component, Server Action and Route Handler that touches protected data must verify the session and the permission itself**, ideally in a central data access layer. Also:
- Keep Next.js patched.
- Strip unexpected internal headers at your reverse proxy or WAF.

(Full architecture: **Authentication & security**.)

---

## Config-level routing

**In `next.config.ts`, no code needed:**

```ts
const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/old-blog/:slug', destination: '/blog/:slug', permanent: true }]   // 308
  },
  async rewrites() {
    return [{ source: '/api/legacy/:path*', destination: 'https://legacy.example.com/:path*' }]   // proxy to a backend
  },
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] }]
  },
}
```

**Order of execution:** `headers` → `redirects` → **Proxy** → `beforeFiles` rewrites → filesystem (pages, public files) → `afterFiles` rewrites → dynamic routes → `fallback` rewrites.

---

## Interview Q&A

**Q: What are Route Handlers?**
Files named `route.ts` in the `app` directory that export HTTP method functions using the Web Request/Response APIs. They're used for webhooks, public APIs, mobile clients, streaming and file downloads.

**Q: What is Proxy (Middleware) and what runs there?**
Code in `proxy.ts` that runs before matched requests to redirect, rewrite, set headers or cookies, or respond early. In Next.js 16 it replaces `middleware.ts` and runs on Node.js. It should stay fast and do only optimistic checks.

**Q: Can you do authentication in Proxy?**
Only optimistic checks, like redirecting when no session cookie exists. Real authorisation must happen near the data (DAL, Server Components, Actions, Route Handlers), as CVE-2025-29927 showed, where middleware could be bypassed with a spoofed header.

**Q: What's the difference between a redirect and a rewrite?**
A redirect changes the browser's URL (307/308). A rewrite serves different content while keeping the URL.

**Q: Route Handler or Server Action for a mutation?**
A Server Action for mutations from your own React UI; a Route Handler for webhooks, external clients and public HTTP contracts.

---

## 🎯 Interview answer

> "Route Handlers are `route.ts` files that export functions named after HTTP methods, using Web Request and Response objects. I use them for webhooks with raw-body signature verification and deduplication, public or mobile APIs, streaming responses and downloads, validating input with zod, checking auth in each handler, and setting CORS and cache headers explicitly, since GET handlers aren't cached by default since Next.js 15 and follow the prerendering model with Cache Components. Proxy, which Next.js 16 renamed from middleware to `proxy.ts` and runs on Node.js, executes before matched requests and can redirect, rewrite, set headers and cookies, or respond early. That makes it good for locale and legacy redirects, A/B tests and multi-tenant rewrites, security headers, and optimistic auth redirects based on a session cookie, scoped with a matcher. I keep it fast, with no database calls, since it also runs on prefetches, and I prefer `next.config` redirects for static rules. I never rely on it for authorisation: CVE-2025-29927 let attackers skip middleware with a spoofed header, so every Server Component, Action and Route Handler touching protected data verifies the session and permission in the data access layer, and we keep Next.js patched."
