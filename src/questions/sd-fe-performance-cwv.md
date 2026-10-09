## What the JD says

> "**Optimize applications for performance, accessibility, and scalability**" · "**Optimise applications for performance, responsiveness and scalability (Core Web Vitals awareness)**" · "scalable, **high-performance** web applications"

---

## What it means

**Performance in e-commerce is money:** faster pages lead to more conversions, better SEO rankings (Core Web Vitals are a Google ranking signal), and lower bounce rates, especially on mobile.

**Core Web Vitals** are Google's 3 key user-experience metrics, measured on **real users** at the **75th percentile**:

| Metric | Measures | Good | Needs work | Poor |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | **Loading:** when the main content (hero image, product image, heading) appears | **≤ 2.5s** | 2.5–4s | > 4s |
| **INP** (Interaction to Next Paint) | **Responsiveness:** delay from a click, tap or keypress to the next visual update | **≤ 200ms** | 200–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | **Visual stability:** how much content jumps around | **≤ 0.1** | 0.1–0.25 | > 0.25 |

**INP replaced FID (First Input Delay) in March 2024.** If someone mentions FID, mention that.

**Supporting metrics:** **TTFB** (server response time), **FCP** (first content painted), **TBT** (Total Blocking Time, a lab metric that approximates INP).

**Analogy: a restaurant** 🍽️

- **LCP** = how long until your main dish arrives.
- **INP** = how quickly the waiter reacts when you raise your hand.
- **CLS** = whether the table moves while you're eating.

---

## What they expect

- **Know the metrics, thresholds and causes** of each.
- **Measure properly:** field data (real users) vs lab data (Lighthouse), and why they differ.
- **Have a toolbox of fixes** for each metric, specific to Next.js.
- **Set performance budgets** and stop regressions in CI.
- **Tell a story with numbers:** "LCP went from 4.1s to 1.9s on mobile product pages by…"
- **Scalability:** the site stays fast under traffic peaks (sales) through caching and CDNs, and the code stays fast as features grow.

---

## Measuring

| | **Field data** (real users) | **Lab data** (simulated) |
|---|---|---|
| Sources | **CrUX** (Chrome UX Report), Search Console, **RUM** (the `web-vitals` library, Vercel Analytics, Datadog, SpeedCurve) | **Lighthouse**, PageSpeed Insights lab section, WebPageTest, Chrome DevTools Performance panel |
| Good for | the **truth**: what users really feel, and what Google ranks | **debugging** and CI checks before release |
| INP | ✅ (needs real interactions) | ❌, so use **TBT** as a proxy |

```js
// Real-user monitoring: send Core Web Vitals to your analytics
import { onLCP, onINP, onCLS } from 'web-vitals'

function send(metric) {
  navigator.sendBeacon('/api/vitals', JSON.stringify({
    name: metric.name, value: metric.value, rating: metric.rating, page: location.pathname,
  }))
}
onLCP(send); onINP(send); onCLS(send)
```

**In Next.js:** the `useReportWebVitals` hook from `next/web-vitals` does the same.

---

## Fixing LCP

**LCP breaks down into:** **TTFB** + **resource load delay** + **resource load time** + **render delay**.

| Cause | Fix |
|---|---|
| Slow server (TTFB) | Cache pages (static, ISR, `"use cache"`), CDN, edge caching, faster APIs and a BFF, avoid sequential fetches |
| LCP image discovered late | `next/image` with **`priority`** (preload + `fetchpriority="high"`), don't lazy-load the hero image, no CSS background images for the LCP |
| Large images | Modern formats (AVIF/WebP), correct `sizes`/`srcset`, compression, a CDN |
| Render-blocking CSS and JS | Critical CSS, fewer and smaller stylesheets, `defer` scripts, load third parties after the main content |
| Client-side rendering | Server-render the main content (server components). Don't fetch the hero in `useEffect`. |
| Web fonts | `next/font` (self-hosted, `font-display: swap`, preloaded) |

```tsx
<Image src={product.images[0].url} alt={product.images[0].alt}
       width={800} height={800} priority sizes="(min-width: 1024px) 50vw, 100vw" />
```

---

## Fixing INP

**INP is bad when the main thread is busy** while the user interacts: too much JavaScript, heavy re-renders, long tasks.

| Cause | Fix |
|---|---|
| Too much JavaScript | **Server components** (no JS for static parts), code splitting (`next/dynamic`), remove unused libraries, smaller dependencies |
| Heavy re-renders | Memoisation or the **React Compiler**, state colocation, avoid context that changes too often, virtualise long lists |
| Expensive work in event handlers | **`useTransition`** for non-urgent updates (filtering), move heavy computation to a Web Worker, debounce |
| Long tasks (> 50ms) | Break up work, yield to the main thread (`scheduler.yield()` / `setTimeout`), defer non-critical work |
| Third-party scripts (tags, chat, A/B tools) | `next/script` with `strategy="lazyOnload"`, audit and remove unused tags, or move them off the main thread (Partytown) |
| Hydration cost | Fewer client components, Partial Prerendering, lazy-hydrate below-the-fold widgets |

```tsx
const [isPending, startTransition] = useTransition()

function onFilterChange(value: string) {
  setInputValue(value)                                   // urgent: the checkbox updates instantly
  startTransition(() => router.push(`?color=${value}`))  // non-urgent: results can follow
}
```

---

## Fixing CLS

| Cause | Fix |
|---|---|
| Images without dimensions | Always set `width`/`height` (or `aspect-ratio`); `next/image` does this |
| Ads, embeds, banners injected later | **Reserve space** (min-height placeholders) |
| Web fonts swapping | `next/font` (size-adjusted fallback fonts) |
| Content inserted above existing content (cookie banners, "free shipping" bars) | Overlay them, or reserve their space from the start |
| Skeletons with different sizes from the content | Match skeleton dimensions to the real layout |
| Animations of `top`/`height` | Animate `transform` instead |

---

## Bundle & network

- **Analyse the bundle:** `@next/bundle-analyzer`. Find large libraries (moment → date-fns or `Intl`; lodash → native or per-method imports).
- **Code-split by route** (automatic in Next.js) and **by component** (`next/dynamic` for heavy widgets).
- **Tree shaking:** ES module imports, `sideEffects` in libraries.
- **Prefetching:** `next/link` prefetches routes in view or on hover.
- **Compression** (Brotli), HTTP/2 or HTTP/3, long-term caching of hashed assets (`Cache-Control: public, max-age=31536000, immutable`).
- **Resource hints:** `preconnect` to the image CDN and API origins.

---

## Scalability

| Layer | Technique |
|---|---|
| **CDN / edge** | Serve static and cached HTML from the edge; cache images; stale-while-revalidate |
| **Next.js caching** | Static and cached product pages with tag-based invalidation; dynamic only where needed |
| **BFF / APIs** | Response caching (Redis), request coalescing, connection pooling, timeouts and circuit breakers |
| **Traffic peaks** | Load tests (k6) before sales, autoscaling, a "sale mode" with longer cache times, queueing for checkout |
| **Front-end codebase** | Performance budgets in CI so performance doesn't decay as teams add features |

---

## Performance budgets

```yaml
# lighthouserc.yml: Lighthouse CI fails the build if budgets are broken
ci:
  collect:
    url: ['http://localhost:3000/', 'http://localhost:3000/products/demo-shoe']
    numberOfRuns: 3
  assert:
    assertions:
      categories:performance: ['error', { minScore: 0.9 }]
      largest-contentful-paint: ['error', { maxNumericValue: 2500 }]
      cumulative-layout-shift: ['error', { maxNumericValue: 0.1 }]
      total-blocking-time: ['warn', { maxNumericValue: 200 }]
      categories:accessibility: ['error', { minScore: 0.95 }]
```

**Also:**

- **Bundle-size checks on PRs** (size-limit).
- **RUM dashboards with alerts** when the p75 metrics worsen.
- **A performance owner** for each critical page.

---

## Responsiveness

**The JD says "performance, responsiveness":** this means both **fast reaction (INP)** and **responsive layouts** across devices:

- **Mobile-first CSS**, fluid layouts (grid/flex, `clamp()`), container queries.
- **Responsive images** (`sizes`/`srcset`).
- **Touch targets of at least 24×24 CSS px** (WCAG 2.2), with no hover-only interactions.
- **Test on real mid-range Android devices** with network throttling. Your laptop isn't your users.

---

## What to learn

- ✅ **LCP, INP and CLS:** thresholds, p75, field vs lab, what INP replaced (FID, in 2024).
- ✅ **Tools:** Lighthouse, PageSpeed Insights, CrUX, the `web-vitals` library, the DevTools Performance panel (long tasks, flame charts), WebPageTest.
- ✅ **Next.js tools:** `next/image` priority and sizes, `next/font`, `next/script` strategies, `next/dynamic`, bundle analyzer, caching, PPR.
- ✅ **React:** `useTransition`, `useDeferredValue`, memoisation vs the React Compiler, virtualisation, React Profiler.
- ✅ **Third-party script governance.**
- ✅ **Performance budgets** with Lighthouse CI and size-limit.
- ✅ **CDN and HTTP caching headers**, stale-while-revalidate.
- ✅ **Load testing** (k6) for peak events.

---

## Interview questions

**Q: What are Core Web Vitals?**
LCP for loading (≤ 2.5s), INP for responsiveness (≤ 200ms, replaced FID in 2024), and CLS for visual stability (≤ 0.1), measured on real users at the 75th percentile.

**Q: How would you improve LCP on a product page?**
Server-render and cache the page, prioritise the hero image with `next/image` `priority` and correct sizes in AVIF/WebP, reduce TTFB with caching and a CDN, self-host fonts with `next/font`, and defer third-party scripts.

**Q: How do you improve INP?**
Ship less JavaScript (server components, code splitting), reduce re-renders, use `useTransition` for non-urgent updates, break up long tasks, and tame third-party scripts.

**Q: Lighthouse says 98 but CrUX shows poor INP. Why?**
Lighthouse is lab data on a fast simulated load with no real interactions; field data reflects real devices, networks and interactions. Trust the field data and debug with RUM breakdowns.

**Q: How do you stop performance regressions?**
Budgets in CI (Lighthouse CI, bundle size limits), RUM dashboards with alerts, and performance in the Definition of Done.

---

## 🎯 Interview answer

> "For e-commerce, performance directly affects conversion and SEO, so I treat Core Web Vitals as product requirements: LCP under 2.5 seconds, INP under 200 milliseconds and CLS under 0.1, at the 75th percentile of real users. I measure with field data from CrUX and our own RUM via the web-vitals library, and use Lighthouse and the DevTools Performance panel for debugging. For LCP, I server-render and cache pages so TTFB is low, prioritise the hero image with `next/image` `priority` and correct sizes in modern formats, self-host fonts with `next/font`, and defer third-party scripts. For INP, I reduce JavaScript with server components and code splitting, avoid unnecessary re-renders, with memoisation or the React Compiler, use `useTransition` for non-urgent updates like filtering, and break up long tasks. For CLS, I always reserve space for images, banners and late content. To keep it that way at scale, I add performance budgets to CI with Lighthouse CI and bundle-size checks, alert on RUM regressions, and make sure the caching and CDN strategy can absorb traffic peaks like sales."
