## 📄 Original answer (PDF)

**Question:** Compare Client-Side Rendering (CSR), SSR, Static Site Generation (SSG), and Incremental Static Regeneration (ISR). When to use which?

**Answer:** CSR for highly interactive dashboards hidden behind Auth. SSR for SEO-critical, highly dynamic pages (user profiles). SSG for static content (marketing pages, docs) pushed to CDNs. ISR for large-scale content that changes periodically but needs SSG speeds (blogs, e-commerce products).

**Real-time example:** An e-commerce platform uses SSG for the homepage, ISR for product detail pages (revalidating every 60s for price changes), and CSR for the user's shopping cart and checkout flow.

---

## 💡 Comparison table

| | **CSR** | **SSR** | **SSG** | **ISR** |
|---|---|---|---|---|
| HTML built | in the browser | per request on the server | at build time | at build, then regenerated in the background |
| First load (LCP) | slow (needs JS + an API call) | medium (depends on TTFB) | ⚡ fastest (CDN) | ⚡ fast (CDN) |
| SEO | weak | ✅ | ✅ | ✅ |
| Data freshness | live | live | stale until rebuild | stale for up to N seconds, or until on-demand revalidation |
| Server cost | lowest | highest | ~none | low |
| Personalisation | ✅ | ✅ | ❌ | ❌ (unless mixed with client or dynamic parts) |
| Use for | dashboards behind login, admin tools | personalised or very dynamic SEO pages | docs, marketing | products, categories, blogs |

---

## 💡 What modern Next.js adds

**Two additions make "one strategy per page" out of date:**

- **Streaming SSR with Suspense:** send the page shell immediately and stream the slow parts later, so TTFB isn't blocked by the slowest API.
- **Partial Prerendering / Cache Components (Next.js 16):** **one page mixes** a static, cached shell with **dynamic holes**. For example, a product page with cached details plus live stock and personalised recommendations. `"use cache"` + `cacheTag` + `cacheLife` replace most per-page ISR settings.

**On-demand revalidation beats fixed timers:** instead of "revalidate every 60s" (which can still show a wrong price for up to 60s, and rebuilds pages that didn't change), have the commerce platform's **webhook** call `revalidateTag('product:123', 'max')` when the price actually changes.

---

## 💡 Price correctness caveat

**The PDF example (ISR every 60s "for price changes") is common, but an architect should add:**

- **Cached prices are for display.** The **cart and checkout always re-validate price and stock on the server**.
- **For flash sales**, use on-demand revalidation or render price/stock dynamically (a Suspense hole), not a 60-second window.
- **Cart and checkout:** CSR-heavy interaction is fine, but the **data** must come from per-user, uncached server calls.

---

## 💡 Decision guide

```
Is the page the same for every user?
├── No (personalised) ──▶ needs SEO? ── Yes ─▶ SSR (stream with Suspense) / cached shell + dynamic holes
│                                     └─ No ──▶ CSR behind auth (or SSR for a faster first paint)
└── Yes ─▶ How often does it change?
          ├── Rarely / only on deploy ─▶ SSG
          └── Regularly ─▶ ISR / "use cache" + webhook-driven revalidation
```

**Measure the result:** TTFB and LCP in RUM, server CPU, cache hit ratio at the CDN.

---

## 🎯 Interview answer

> "CSR renders in the browser, so it's cheap but slow on first load and weak for SEO; I use it behind login for dashboards. SSR renders per request, giving fresh, personalised, SEO-friendly HTML at the cost of server time and TTFB. SSG builds pages at build time for CDN speed, ideal for docs and marketing. ISR serves static pages but regenerates them in the background or on demand, which suits large catalogues. In modern Next.js I don't treat it as one choice per page: streaming SSR with Suspense sends the shell immediately, and Partial Prerendering with Cache Components lets one product page combine a cached shell with dynamic holes for live stock or recommendations. I prefer webhook-driven tag revalidation over fixed timers, so prices update when they actually change, and cached prices are display-only: the cart and checkout always re-validate on the server."
