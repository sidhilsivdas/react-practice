## What the JD says

> "**Translate business and UX requirements into clean, performant code**" · "collaborate with product, design, and backend teams"

---

## What it means

**You receive:** a user story ("As a shopper I want to filter products by size…"), acceptance criteria, and a Figma design.

**You deliver:** working, tested, accessible, fast code that does **exactly what the business needs**, including all the cases the design didn't show.

**The skill isn't typing code.** It's **analysing**:

- **Asking the right questions.**
- **Spotting missing states and edge cases.**
- **Breaking the work into components and tasks.**
- **Agreeing the API contract.**
- **Estimating the effort.**
- **Delivering in small, safe steps.**

**Analogy: an architect turning a family's wish list into a blueprint** 📐 "We want a big kitchen" becomes exact measurements, plumbing, electrics, and what happens when it rains.

---

## What they expect

- **Clarify before coding:** questions about business rules, edge cases and non-functional needs.
- **Think in states, not just the "happy" screen:** loading, empty, error, partial, offline, permissions.
- **Component breakdown** that matches the design system, with reuse instead of one-offs.
- **An API contract agreed** with the backend early (and mocked so the front end isn't blocked).
- **Accessibility, performance, analytics and SEO built in**, not added at the end.
- **Small pull requests behind feature flags**, so features ship safely and incrementally.
- **Definition of Done:** tests, accessibility check, design review, analytics events, documentation.

---

## Step by step

### 1. Understand the requirement

**User story:** "As a shopper, I want to filter products by size and colour, so that I find items available in my size quickly."

**Questions to ask product and UX:**

| Area | Questions |
|---|---|
| Business rules | Multi-select within a filter? AND or OR between filters? Hide out-of-stock sizes or disable them? |
| Data | Where do filter values and counts come from (the search API facets)? How many values (50 colours)? |
| URL & SEO | Shareable filtered URLs? Should filtered pages be indexed? |
| Mobile | Drawer or inline? Apply instantly or with an "Apply" button? |
| Edge cases | No results? API down? A filter value that no longer exists in an old shared link? |
| Non-functional | Performance target? Analytics events? Accessibility level? Languages? |

### 2. Write acceptance criteria (Given / When / Then)

```gherkin
Given I'm on the "Shoes" category
When I select size "42" and colour "Black"
Then I only see products available in size 42 and black
And the URL contains ?size=42&color=black
And the result count is announced to screen readers

Given my filters match no products
Then I see "No products match your filters" and a "Clear filters" button
```

**These become your Playwright tests.**

### 3. Map the UI states (beyond the Figma happy path)

| State | UI |
|---|---|
| Loading | Skeleton grid (same size as the cards: no layout shift) |
| Success | Product grid + result count |
| Empty | Message + "Clear filters" |
| Error | "Couldn't load products" + Retry, with the filters kept |
| Partial | Results show, but facet counts failed: hide the counts, keep the filters working |
| Slow network | Keep old results visible and dimmed while new ones load (`useTransition`) |

### 4. Break it into components

```
CategoryPage (server: reads searchParams, fetches products + facets)
├── FilterPanel (client: reads/writes URL params)
│   ├── FilterGroup "Size"   → CheckboxList (design-system component)
│   ├── FilterGroup "Colour" → SwatchList
│   └── ClearFiltersButton
├── ActiveFilterChips (client)
├── ResultCount (aria-live="polite")
└── ProductGrid (server) → ProductCard × N
```

**Reuse design-system components.** If something new is needed (`SwatchList`), build it generically, and agree it with UX.

### 5. Agree the API contract and mock it

```http
GET /api/products?category=shoes&size=42&color=black&sort=popular&cursor=…
→ { items: Product[], total: 37, nextCursor: "…",
    facets: { size: [{ value: "42", count: 37 }], color: [{ value: "black", count: 12 }] } }
```

- **Write it as OpenAPI or TypeScript types**, shared with the backend.
- **Mock it with MSW (Mock Service Worker)**, so front-end work and tests start before the backend is ready.

### 6. Build in thin vertical slices

1. **The URL-driven filter state + server fetch** (works without JavaScript, too).
2. **The UI components**, using design-system pieces.
3. **The loading, empty and error states.**
4. **The mobile drawer.**
5. **Analytics events** (`filter_applied`).
6. **Tests:** unit (filter → URL helpers), component (FilterPanel), Playwright (the acceptance criteria).

**Each slice is a small PR, behind a feature flag if it isn't ready for users.**

### 7. Definition of Done

- ✅ **Acceptance criteria pass** (Playwright).
- ✅ **Design review with UX** (spacing, responsiveness, motion).
- ✅ **Accessibility:** keyboard, screen reader, contrast, axe check.
- ✅ **Performance:** no regression in bundle size, LCP, INP or CLS.
- ✅ **Analytics events verified.**
- ✅ **Error tracking / logging in place.**
- ✅ **Documentation / Storybook updated.**

---

## Turning UX into code

- **Design tokens, not hard-coded values:** `var(--space-4)`, not `16px`; `text-primary`, not `#1a73e8`.
- **Responsive behaviour:** confirm breakpoints, and what changes at each one.
- **Interaction details:** hover, focus, active, disabled, loading button states; animation durations; `prefers-reduced-motion`.
- **Content resilience:** long product names, translated text 30% longer, missing images, very large prices.
- **Push back constructively** when a design hurts accessibility or performance (low contrast text, a huge autoplay video above the fold), and offer an alternative.

---

## Estimation & planning

- **Break work into tasks of under 1 day** (component, API integration, tests, states).
- **Identify risks and unknowns early** (an unclear API, a third-party script), and time-box spikes.
- **Communicate trade-offs:** "the full version is 8 days; an MVP without the colour swatches is 4 days".
- **Track non-functional work explicitly** (accessibility, tests, performance), so it isn't cut silently.

---

## What to learn

- ✅ **User stories, acceptance criteria**, Given/When/Then (BDD).
- ✅ **UI state modelling:** loading, empty, error and partial states; skeletons; optimistic UI.
- ✅ **Component breakdown** from designs; design tokens; Figma Dev Mode.
- ✅ **API contract-first:** OpenAPI, TypeScript types, MSW mocks.
- ✅ **URL state for filters and search.**
- ✅ **Feature flags** and incremental delivery.
- ✅ **Estimation, risk and scope negotiation.**
- ✅ **A Definition of Done** that includes accessibility and performance.

---

## Interview questions

**Q: You get a Figma design and a user story. What do you do first?**
Clarify the business rules and edge cases with product and UX, write acceptance criteria, list all the UI states, break it into components, agree and mock the API contract, then build in small vertical slices with tests.

**Q: The design only shows the happy path. What do you do?**
Map loading, empty, error, partial and long-content states, propose solutions using design-system patterns, and confirm them with UX before building.

**Q: How do you avoid being blocked by the backend?**
Agree the contract early (OpenAPI or types), mock it with MSW, and build against the mock. The same mocks power tests.

**Q: A design hurts performance or accessibility. What do you do?**
Explain the impact with data (contrast ratio, LCP cost), propose an alternative that keeps the intent, and decide together.

---

## 🎯 Interview answer

> "I start by making sure I understand the problem, not just the screen: I clarify business rules and edge cases with product and UX, like how filters combine or what happens when something is out of stock, and capture them as Given/When/Then acceptance criteria, which later become Playwright tests. The design usually shows the happy path, so I map every state (loading, empty, error, partial, slow network, long content) and agree the solutions with UX. Then I break the design into components, reusing the design system and building any new pieces generically with tokens. I agree the API contract with the backend early, as OpenAPI or shared TypeScript types, and mock it with MSW so neither side is blocked. I deliver in thin vertical slices, in small PRs behind feature flags, and my Definition of Done includes accessibility checks, no performance regression, analytics events, error tracking and a UX review. If a design conflicts with accessibility or performance, I bring data and an alternative rather than just saying no."
