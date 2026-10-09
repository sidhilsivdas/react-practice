## What the JD says

> "Develop and enhance frontend features using **React / Next.js**, following established architecture and coding standards **with command on HTML5/CSS3**"

---

## What it means

- **Next.js is the React framework** most e-commerce teams use, because it gives **server rendering (SEO + fast first load)**, routing, caching, image optimisation and API routes out of the box.
- **"Command"** means you can choose the right **rendering strategy per page**, use **server and client components** correctly, control **caching**, and debug performance.
- **HTML5/CSS3 command** means semantic, accessible markup and modern CSS (flex, grid, responsive units, container queries), without leaning on libraries for everything. (See the **HTML & CSS** tab.)

**Current version:** **Next.js 16** (October 2025, latest 16.3 in August 2026). It brought:

- **Cache Components** (`"use cache"`)
- **`proxy.ts`** replacing `middleware.ts`
- **Turbopack** as the default bundler
- **Stable React Compiler support**
- **React 19.2** features

---

## Rendering strategies

| Strategy | HTML created | Fresh data? | Speed | Use for (e-commerce) |
|---|---|---|---|---|
| **SSG** (static) | at **build time** | only on rebuild | ⚡ fastest (CDN) | about us, help pages, landing pages |
| **ISR** (static + revalidate) | at build, then **regenerated in the background** after a time or on demand | ✅ every N seconds / on webhook | ⚡ fast | **product & category pages** |
| **SSR** (dynamic) | on **every request** | ✅ always | slower (server work) | personalised pages, search results, account |
| **CSR** (client) | in the **browser** after JS loads | ✅ | slow first paint, poor SEO | dashboards behind login, highly interactive widgets |
| **PPR / Cache Components** | **static shell** instantly + **dynamic holes** streamed in | ✅ for the dynamic parts | ⚡ + fresh | product page with static details + live price/stock/personal recommendations |

**Analogy: a restaurant** 🍽️

- **SSG** = sandwiches made in the morning.
- **ISR** = sandwiches restocked every hour.
- **SSR** = cooked to order.
- **CSR** = you get the ingredients and cook at your table.
- **PPR** = the plate arrives instantly with the bread already on it, and the hot dish follows a moment later.

---

## Server vs client components

**In the App Router, components are server components by default.** They run on the server, can `await` data directly, and send **zero JavaScript** to the browser.

```tsx
// app/products/[slug]/page.tsx: SERVER component (default)
import { getProduct } from '@/features/product/api'
import AddToCartButton from '@/features/cart/components/AddToCartButton'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params                    // Next 15+: params is async
  const product = await getProduct(slug)           // fetch on the server, no useEffect

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />   {/* only this ships JS */}
    </main>
  )
}
```

```tsx
// features/cart/components/AddToCartButton.tsx: CLIENT component
'use client'                                        // needed for state, effects, event handlers
import { useTransition } from 'react'
import { addToCart } from '../actions'

export default function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button disabled={isPending} onClick={() => startTransition(() => addToCart(productId, 1))}>
      {isPending ? 'Adding…' : 'Add to cart'}
    </button>
  )
}
```

| | Server component | Client component (`'use client'`) |
|---|---|---|
| Runs | on the server | on the server (for HTML) **and** in the browser |
| `async/await` data | ✅ | ❌ (use TanStack Query / `use()`) |
| `useState`, `useEffect`, `onClick` | ❌ | ✅ |
| Secrets, DB, private APIs | ✅ safe | ❌ never |
| Ships JavaScript | ❌ | ✅ |

**Architect rule: keep client components small and at the leaves** (buttons, forms, carousels), and pass server-rendered content into them as `children`.

---

## Caching in Next.js 16

**Next.js 16 made caching explicit and opt-in with Cache Components:**

```ts
// next.config.ts
const nextConfig = { cacheComponents: true }
export default nextConfig
```

```ts
// features/product/api/getProduct.ts
import { cacheLife, cacheTag } from 'next/cache'

export async function getProduct(slug: string) {
  'use cache'                         // cache this function's result
  cacheTag(`product:${slug}`)         // label it for targeted invalidation
  cacheLife('hours')                  // how long it stays fresh
  return commerce.products.getBySlug(slug)
}
```

**Invalidate when data changes:**

```ts
// app/api/webhooks/commerce/route.ts: the commerce platform calls this when a product changes
import { revalidateTag } from 'next/cache'

export async function POST(request: Request) {
  const event = await request.json()                       // verify the signature first!
  revalidateTag(`product:${event.slug}`, 'max')            // Next 16: SWR with a cacheLife profile
  return Response.json({ ok: true })
}
```

```ts
// in a Server Action, when the user must see their own change immediately
'use server'
import { updateTag } from 'next/cache'

export async function updateProfile(userId: string, data: Profile) {
  await db.users.update(userId, data)
  updateTag(`user:${userId}`)          // read-your-writes: expire + fresh read in the same request
}
```

**Dynamic data stays dynamic by default** (cart, user, live stock). Wrap it in `<Suspense>` so the static shell shows instantly:

```tsx
<ProductDetails slug={slug} />                      {/* cached */}
<Suspense fallback={<StockSkeleton />}>
  <LiveStock productId={id} />                      {/* runs at request time, streamed */}
</Suspense>
```

**Older API you'll still see** (Next 13–15 and many codebases):

- `export const revalidate = 3600`
- `fetch(url, { next: { revalidate: 60, tags: ['products'] } })`
- `generateStaticParams` to pre-build popular product pages

---

## Core App Router features

| Feature | Use |
|---|---|
| `layout.tsx` | Shared UI (header, footer) that keeps state between pages |
| `loading.tsx` | Instant loading UI (an automatic Suspense boundary) |
| `error.tsx` / `not-found.tsx` | Error boundary per route segment, and 404s |
| **Route groups** `(shop)` | Organise routes without changing URLs |
| **Dynamic routes** `[slug]`, `[...path]` | Product and category pages |
| **Route handlers** `route.ts` | API endpoints / BFF / webhooks |
| **Server Actions** `'use server'` | Mutations (add to cart, submit forms) without writing API routes |
| **`proxy.ts`** (was `middleware.ts`) | Redirects, locale detection, auth cookie checks, A/B bucketing: lightweight only |
| `generateMetadata` | SEO titles, Open Graph, canonical URLs |
| `next/image` | Responsive, lazy, modern formats; `priority` for the LCP image |
| `next/font` | Self-hosted fonts with no layout shift |
| `next/link` | Client navigation with prefetching |

```tsx
export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)
  return {
    title: `${product.name} | MyShop`,
    description: product.summary,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { images: [product.images[0].url] },
  }
}
```

---

## Choosing per page

| Page | Strategy | Why |
|---|---|---|
| Home / campaign landing | Static + `"use cache"` (hours), revalidated by CMS webhook | SEO, top LCP |
| Category / listing | Cached per category + **filters in the URL**; personalised bits dynamic | SEO for main categories, fast |
| **Product detail** | Cached product data (tag per product, webhook invalidation) + **dynamic price/stock in Suspense** | SEO + correct stock |
| Search results | Dynamic (SSR) or client-side with a search API | Unlimited query combinations |
| Cart / checkout | Dynamic, `no-store`, client interactivity | Personal, must be exact |
| Account / orders | Dynamic behind auth | Personal data |

---

## What to learn

- ✅ **Rendering strategies:** SSG, ISR, SSR, CSR, PPR/Cache Components, and when to use each.
- ✅ **Server vs client components**, the `'use client'` boundary, and passing server components as children.
- ✅ **Data fetching on the server**, Suspense streaming, `loading.tsx` and `error.tsx`.
- ✅ **Caching:** `"use cache"`, `cacheTag`, `cacheLife`, `revalidateTag` / `updateTag` / `refresh`, and the older fetch `revalidate`.
- ✅ **Server Actions**, form handling, `useActionState`, optimistic UI.
- ✅ **`proxy.ts`**, `generateMetadata`, `next/image`, `next/font`, route handlers.
- ✅ **Deployment:** Vercel vs self-hosting (Docker, `output: 'standalone'`), CDN caching.
- ✅ **HTML5/CSS3** fundamentals (this site's HTML & CSS tab).

---

## Interview questions

**Q: SSR vs SSG vs ISR?**
SSG builds HTML once at build time; ISR serves static HTML but regenerates it in the background after a time or on demand; SSR renders on every request. ISR suits product pages: fast like static, but kept fresh.

**Q: Server vs client components?**
Server components run only on the server, can fetch data and use secrets, and ship no JS. Client components handle interactivity and state. I keep client components small, at the leaves.

**Q: How do you keep product data fresh without SSR on every request?**
Cache product data with tags, and have the commerce platform's webhook call `revalidateTag` for the changed product. Dynamic values like stock go in a Suspense boundary.

**Q: What replaced middleware in Next.js 16?**
`proxy.ts`. It's for lightweight request handling like redirects, rewrites and auth cookie checks, and runs on the Node.js runtime.

**Q: What are Server Actions?**
Async server functions marked `'use server'`, called directly from forms or client components for mutations, with no separate API route needed.

---

## 🎯 Interview answer

> "I choose rendering per page. Marketing and content pages are static and revalidated by CMS webhooks; product and category pages are cached with tags, so they're as fast as static but invalidated precisely when the commerce platform sends a webhook; and personalised or exact data like the cart, checkout, account and live stock is rendered dynamically, often streamed inside Suspense boundaries so the static shell appears instantly. That's the Partial Prerendering model Next.js 16 formalised with Cache Components and the `use cache` directive, using `cacheTag` and `cacheLife`, with `revalidateTag` for background refresh and `updateTag` in Server Actions for read-your-writes. In the App Router I default to server components, which fetch on the server and ship no JavaScript, and keep `'use client'` components small at the leaves, like add-to-cart buttons and filters. I use Server Actions for mutations, `generateMetadata` and structured data for SEO, `next/image` with priority on the LCP image, `next/font` to avoid layout shift, and `proxy.ts` only for lightweight things like redirects, locale and auth checks."
