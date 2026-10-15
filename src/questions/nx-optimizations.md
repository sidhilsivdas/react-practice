## Quick answer

**Next.js has built-in components and APIs for the most common performance and SEO work:**

- **`next/image`:** automatic resizing, modern formats (WebP/AVIF), lazy loading, responsive `srcset`, and no layout shift. In Next.js 16, use **`preload`** instead of the deprecated `priority` for the LCP image.
- **`next/font`:** self-hosts Google and local fonts at build time, with zero layout shift and no requests to Google.
- **`next/script`:** loading strategies for third-party scripts.
- **Metadata API:** `metadata` / `generateMetadata`, plus file-based `sitemap.ts`, `robots.ts` and `opengraph-image.tsx`.
- **Less JavaScript:** Server Components by default, `next/dynamic` / `React.lazy`, automatic code splitting per route, Turbopack, and React Compiler support.

---

## Images: next/image

```tsx
import Image from 'next/image'
import hero from './hero.jpg'                     // static import: width, height and blur placeholder are automatic

export default function Hero() {
  return (
    <Image
      src={hero}
      alt="Summer collection"
      preload                                      // Next.js 16: the LCP image (replaces the deprecated `priority`)
      placeholder="blur"
      sizes="100vw"
    />
  )
}

// remote image: set width/height (or `fill`) and allow the host in next.config
<Image
  src="https://cdn.shop.com/p/42.jpg"
  alt="Running shoe"
  width={600}
  height={600}
  sizes="(max-width: 768px) 50vw, 300px"           // which size to download on each screen
/>

// unknown dimensions: fill the parent (which needs position: relative and a size)
<div style={{ position: 'relative', aspectRatio: '16 / 9' }}>
  <Image src={url} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
</div>
```

```ts
// next.config.ts
images: {
  remotePatterns: [{ protocol: 'https', hostname: 'cdn.shop.com', pathname: '/p/**' }],   // `domains` is deprecated
  formats: ['image/avif', 'image/webp'],
}
```

**What it does for you:**
- Resizes and converts the image on demand, and caches the result (the Next.js 16 default `minimumCacheTTL` is 4 hours).
- Generates `srcset` from `sizes`, so phones download small files.
- **Lazy-loads** by default (except `preload` images).
- **Reserves space** (width/height or `fill` + aspect ratio), so there's **no CLS**.

**Common mistakes:**
- Lazy-loading the LCP image: mark it with `preload`.
- Missing `sizes` with `fill`: the browser downloads the largest image.
- Huge remote originals, and forgetting `remotePatterns`.
- Next.js 16 security defaults: local images with query strings need `images.localPatterns`, and local IP addresses are blocked by default.

---

## Fonts: next/font

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const brand = localFont({ src: './fonts/Brand.woff2', variable: '--font-brand' })

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${brand.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

**Benefits:**
- **Downloads fonts at build time and serves them from your domain:** no extra DNS or TLS round trip, and no requests to Google (better for privacy and GDPR).
- **Automatic `size-adjust` fallback metrics:** the fallback font is sized like the real one, so text doesn't jump when the font loads (no CLS).
- Preloads only the subsets you use, and works with CSS variables (Tailwind).

---

## Third-party scripts: next/script

```tsx
import Script from 'next/script'

<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXX" strategy="afterInteractive" />
<Script src="https://widget.chat.com/loader.js" strategy="lazyOnload" />
```

| Strategy | Loads | Use for |
|---|---|---|
| `beforeInteractive` | Before hydration (in the root layout only) | Rare: bot detection, cookie consent that must run first |
| **`afterInteractive`** (default) | Right after hydration | Analytics, tag managers |
| **`lazyOnload`** | When the browser is idle | Chat widgets, social embeds |
| `worker` (experimental) | In a Web Worker (Partytown) | Heavy third-party scripts off the main thread |

**Third-party scripts are a top cause of bad INP and TBT.** Audit them, delay them, and load them only on the pages that need them.

---

## Metadata & SEO

```tsx
// static metadata: app/layout.tsx or any page
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://shop.example.com'),
  title: { default: 'Shop', template: '%s | Shop' },       // child pages: "Shoes | Shop"
  description: 'Sustainable running gear',
  openGraph: { type: 'website', images: ['/og.png'] },
  alternates: { canonical: '/' },
}

// dynamic metadata: app/products/[id]/page.tsx
export async function generateMetadata({ params }: PageProps<'/products/[id]'>): Promise<Metadata> {
  const product = await getProduct((await params).id)        // deduplicated with the page via React.cache
  if (!product) return { title: 'Not found', robots: { index: false } }
  return {
    title: product.title,
    description: product.summary,
    openGraph: { images: [product.imageUrl] },
    alternates: { canonical: `/products/${product.slug}` },
  }
}
```

**File-based metadata routes:**

```ts
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProductSlugs()
  return [
    { url: 'https://shop.example.com', changeFrequency: 'daily', priority: 1 },
    ...products.map((slug) => ({ url: `https://shop.example.com/products/${slug}`, lastModified: new Date() })),
  ]
}

// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/account/' }, sitemap: 'https://shop.example.com/sitemap.xml' }
}
```

**Also:**
- `opengraph-image.tsx` generates social images with `ImageResponse` (JSX → PNG).
- `icon.png` / `favicon.ico`, and `manifest.ts`.
- **Structured data (JSON-LD):** render `<script type="application/ld+json">` in the page (product, breadcrumb and article schemas).
- **`generateViewport`** for viewport and theme colour.

**SEO checklist:** server-rendered HTML (not CSR), unique titles and descriptions, canonical URLs, a sitemap, correct 404/301 status codes (`notFound()`, `permanentRedirect()`), semantic HTML, fast Core Web Vitals, and `hreflang` (`alternates.languages`) for i18n.

---

## Reducing JavaScript

1. **Keep components on the server.** Push `"use client"` down to small interactive leaves. A large library used only in a Server Component (markdown, syntax highlighting, date formatting) ships **zero** bytes to the browser.
2. **Lazy-load heavy client components:**

```tsx
'use client'
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('./chart'), { loading: () => <ChartSkeleton /> })
const MapView = dynamic(() => import('./map'), { ssr: false })   // browser-only library; allowed only in Client Components
```

3. **Automatic code splitting:** every route gets its own chunks, and shared code is deduplicated. (Turbopack 16.4 also shares its runtime across routes.)
4. **Optimise package imports:** use tree-shakeable libraries, import specific modules, and set `optimizePackageImports` for large icon or utility libraries.
5. **Analyse bundles:** the **Turbopack Bundle Analyzer** (16.4 adds route summaries, a table view, history and diffs), or `@next/bundle-analyzer`.
6. **The React Compiler:** `reactCompiler: true` gives automatic memoisation (stable support; increases compile time).

---

## Measuring performance

```tsx
// app/web-vitals.tsx
'use client'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric))   // LCP, INP, CLS, FCP, TTFB
  })
  return null
}
```

**Debugging a slow route:**
1. **Measure where the time goes:**
   - **TTFB** (server: slow data, waterfalls, an uncached route)
   - **LCP** (images, fonts, a render-blocking layout)
   - **INP** (heavy client JavaScript, third-party scripts)
   - **CLS** (missing image sizes, skeletons that don't match the content)
2. **Use the tools:** the dev server request logs (Next.js 16 shows compile vs render time), the Chrome Performance panel, Lighthouse, and real-user monitoring (Vercel Speed Insights, Sentry).
3. **Fix TTFB:** `"use cache"`, parallel fetching, streaming with `<Suspense>` so slow parts don't block, and moving slow awaits out of layouts.
4. **Fix LCP:** `preload` the hero image, use `next/font`, keep the shell static (PPR).
5. **Fix INP:** smaller Client Components, `useTransition`, lazy third-party scripts.

(See also **React app optimization techniques**.)

---

## Interview Q&A

**Q: Why use `next/image` instead of `<img>`?**
Automatic resizing and modern formats, responsive `srcset`, lazy loading, built-in space reservation to prevent CLS, and caching, all from one component.

**Q: How does Next.js optimise fonts?**
`next/font` downloads Google or local fonts at build time and self-hosts them, with no third-party requests, and generates fallback metrics with `size-adjust` so text doesn't shift.

**Q: How do you add SEO metadata?**
A `metadata` object or a `generateMetadata` function in layouts and pages, with title templates, Open Graph data and canonical URLs, plus `sitemap.ts`, `robots.ts`, `opengraph-image` and JSON-LD.

**Q: How do you load third-party scripts efficiently?**
`next/script` with the right strategy (`afterInteractive` for analytics, `lazyOnload` for widgets), only on pages that need them, and audited for main-thread cost.

**Q: How do you reduce client JavaScript?**
Keep components on the server and `"use client"` at the leaves, lazy-load heavy client components with `next/dynamic`, tree-shake imports, and analyse bundles.

---

## 🎯 Interview answer

> "Next.js covers the common performance and SEO work with built-ins. `next/image` resizes and converts images to AVIF or WebP, builds `srcset` from `sizes`, lazy-loads by default and reserves space to prevent layout shift; I mark the LCP image with `preload`, which replaces the deprecated `priority` in Next.js 16, and configure `remotePatterns`. `next/font` self-hosts fonts at build time with size-adjusted fallbacks, so there are no third-party requests and no CLS. `next/script` controls third-party loading, with `afterInteractive` for analytics and `lazyOnload` for widgets. For SEO I use the Metadata API: static `metadata` with title templates and canonical URLs, `generateMetadata` deduplicated with the page via `React.cache`, `sitemap.ts`, `robots.ts`, generated Open Graph images, JSON-LD, and correct status codes through `notFound` and `permanentRedirect`. To reduce JavaScript I keep components on the server, push `use client` to the leaves, lazy-load heavy client parts with `next/dynamic`, and check the Turbopack bundle analyzer. I measure Core Web Vitals with `useReportWebVitals` and real-user monitoring, and debug slow routes by separating server time, fixed with caching, parallel fetching and streaming, from client-side LCP, INP and CLS issues."
