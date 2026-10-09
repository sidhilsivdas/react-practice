## Short answer

**Front-end system design interviews are open-ended on purpose**: "Design a product listing page", "Design an autocomplete", "Design a checkout". There's no single right answer. They watch **how you think**.

**Use a structure so you don't ramble or miss things.** The popular **RADIO** framework:

| Step | Question it answers | Time (45-min round) |
|---|---|---|
| **R**equirements | What exactly are we building? For whom? What's in and out of scope? | ~5 min |
| **A**rchitecture | What are the main parts (components, server, client, cache) and how do they connect? | ~10 min |
| **D**ata model | What data exists, where does it live (server, client, URL), and in what shape? | ~5 min |
| **I**nterface (API) | What do the APIs between client and server, and between components, look like? | ~5–10 min |
| **O**ptimisations | Performance, accessibility, SEO, i18n, security, offline, testing: deep dives | ~15 min |

**It's a guide, not a script.** Real discussions jump back and forth, and that's fine.

**Analogy: building a house** 🏠 **R** = what does the family need? **A** = rooms and how they connect. **D** = what furniture goes where. **I** = the doors and plumbing between rooms. **O** = insulation, solar panels, smart locks.

---

## R: Requirements

**Never start drawing straight away. Ask questions first** (and write the answers down where the interviewer can see them):

**Functional (what it does):**

- **Core user flows:** browse, search, filter, add to cart, checkout?
- **Which pages and features are in scope** for this interview?
- **Logged-in users, guests, or both?**

**Non-functional (how well it does it):**

- **Users and devices:** mobile-first? Slow 3G networks? Which browsers?
- **Scale:** products, traffic, peak events (sales)?
- **SEO needed?** (E-commerce: yes, which affects the rendering choice.)
- **Performance targets:** Core Web Vitals?
- **Accessibility:** WCAG 2.2 AA? (Required by law for EU shops since June 2025.)
- **Internationalisation:** languages, currencies, right-to-left?
- **Real-time needs:** stock levels, prices?

**Close with:** "So the scope is X, Y and Z, optimised for mobile and SEO. I'll leave out A and B unless we have time. Does that sound right?"

---

## A: Architecture

**Draw boxes and arrows.** For a front end, typically:

```
┌──────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│ Browser  │────▶│ CDN / edge cache         │────▶│ Next.js server       │
│ (React   │     │ static assets, cached    │     │ server components,   │
│  client) │◀────│ HTML                     │◀────│ route handlers, BFF  │
└──────────┘     └──────────────────────────┘     └─────────┬────────────┘
                                                            │
                         ┌──────────────────┬───────────────┼───────────────┐
                         ▼                  ▼               ▼               ▼
                   Commerce API        Search API       CMS API        Payments
                   (products, cart)    (Algolia…)       (content)      (Stripe…)
```

**Then break the UI into components** and say what each one owns:

```
ProductListingPage (server: fetches products for the URL's filters)
├── Header (server) → SearchBox (client), MiniCart (client)
├── FiltersSidebar (client: updates the URL)
├── ProductGrid (server) → ProductCard × N
│                             └── AddToCartButton (client)
└── Pagination (server links)
```

**Explain:**

- **Rendering:** what renders on the server vs the client, and why.
- **Who owns state.**
- **Where data comes from.**

---

## D: Data model

**List the entities and fields**, and **where each piece of state lives:**

```ts
type Product = {
  id: string; slug: string; name: string
  price: { amount: number; currency: string }
  images: { url: string; alt: string; width: number; height: number }[]
  inStock: boolean; rating?: number
}

type Cart = { id: string; items: { productId: string; qty: number }[]; total: Money }
```

| State | Where it lives | Why |
|---|---|---|
| Product data | **Server** (fetched, cached) | Shared, SEO, large |
| Filters, sort, page | **URL** (`?color=red&sort=price`) | Shareable, back button works, SEO |
| Cart | **Server** (cart API) + client cache | Survives devices and refreshes |
| Is the menu open, hover state | **Local component state** | Temporary UI only |
| Logged-in user | **Server session** (cookie) + a context | Security |

---

## I: Interface (API)

**Define the key APIs**, with request and response shapes:

```http
GET  /api/products?category=shoes&color=red&sort=price_asc&cursor=abc&limit=24
→ 200 { items: Product[], nextCursor: "def", total: 312, facets: { color: [{ value: "red", count: 40 }] } }

POST /api/cart/items        { productId, qty }   → 200 Cart
PATCH /api/cart/items/:id   { qty }              → 200 Cart
```

**Talk about:**

- **Pagination:** cursor vs offset (cursor is stable when items change).
- **Error shapes.**
- **Caching headers.**
- **Idempotency:** retrying a request doesn't add the item twice.
- **Component props** for reusable components: `<ProductCard product={...} onAddToCart={...} />`.

---

## O: Optimisations

**Pick the areas that matter most for this product**, and go deep on 2–3:

| Area | Examples |
|---|---|
| **Performance** | Rendering strategy, code splitting, image optimisation, caching (CDN, ISR), prefetching, virtualised long lists |
| **Core Web Vitals** | LCP (hero image priority), INP (less JS, transitions), CLS (image dimensions, reserved space) |
| **Accessibility** | Semantic HTML, keyboard navigation, focus management, announcements for cart updates |
| **SEO** | Server-rendered HTML, metadata, structured data (Product schema), canonical URLs for filter combinations |
| **Network** | Debounced search, request deduplication, retries, offline handling |
| **Security** | XSS (React escapes; sanitise CMS HTML), CSRF, auth cookies, rate limits |
| **i18n** | Locale routing, currency formatting with `Intl` |
| **Observability** | Real-user monitoring, error tracking, analytics |
| **Testing** | Unit, integration and Playwright E2E for critical flows (checkout) |

---

## Common questions

**Practise these with RADIO** (time yourself to 40 minutes):

1. **E-commerce product listing page** with filters (very relevant for this JD).
2. **Product detail page.**
3. **Shopping cart and checkout flow.**
4. **Autocomplete / search typeahead.**
5. **Infinite-scroll news feed.**
6. **Image carousel** (a component design question).
7. **Design system / component library** for many teams.
8. **Dashboard with real-time data.**
9. **Chat application** (WebSockets).
10. **Form builder / multi-step form.**

---

## What evaluators look for

| They score | Show it by |
|---|---|
| **Problem exploration** | Asking good questions and agreeing on scope |
| **Architecture** | A clear component and data-flow diagram, clear responsibilities |
| **Technical depth** | Real details: caching headers, Suspense boundaries, focus management |
| **Trade-offs** | "SSR gives SEO but costs server time; ISR gives us both for product pages" |
| **Product and user sense** | Thinking about slow networks, accessibility, empty and error states |
| **Communication** | Thinking out loud, checking in with the interviewer, managing time |

**Red flags:**

- Jumping into code.
- Only one approach, with no alternatives.
- Ignoring mobile, accessibility or errors.
- Long silences.
- Not finishing the core design before going deep.

---

## 🎯 Interview answer

> **"How do you approach a front-end system design question?"**
>
> "I use a structure like RADIO. First requirements: I clarify the core user flows, who the users are and on what devices, scale, and non-functional needs like SEO, performance targets, accessibility and internationalisation, then confirm the scope. Then architecture: a high-level diagram of browser, CDN, the Next.js server or BFF, and the backend APIs, and a component tree showing which parts render on the server and which are interactive client components. Then the data model: entities and where each piece of state lives (server data, URL state for filters, local UI state, session). Then the interfaces: API endpoints with request and response shapes, pagination and error handling, plus key component props. Finally I go deep on the optimisations that matter most for that product, like rendering and caching strategy, Core Web Vitals, accessibility and SEO, explaining the trade-offs and how I'd measure success. I treat it as a conversation and revisit earlier steps when new requirements come up."
