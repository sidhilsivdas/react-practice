## What the JD says

> "**Lead the React frontend development and define application architecture**" · "**Build scalable, maintainable UI solutions**" · "**own React architecture, guide the frontend team**"

---

## What it means

**Front-end architecture is the set of big decisions that are expensive to change later:**

| Decision | Examples |
|---|---|
| **Framework & rendering** | Next.js App Router; which pages are static, server-rendered or client-rendered |
| **Project structure** | Feature-based folders, layers, module boundaries |
| **State management** | Server state (TanStack Query / server components) vs client state (Zustand/Redux/Context) vs URL state |
| **Data fetching** | Where APIs are called (server components, BFF, client), caching, error handling |
| **UI foundation** | Design system, component library, design tokens, styling approach (Tailwind / CSS Modules) |
| **Code organisation at scale** | Monorepo (Turborepo/Nx), shared packages, micro-frontends (rarely) |
| **Quality gates** | TypeScript, linting, testing strategy, CI checks, performance budgets |
| **Cross-cutting concerns** | Auth, i18n, analytics, feature flags, error tracking, logging |

**Analogy: a city planner** 🏙️ You don't build every house, but you decide where the roads, water pipes and zones go, so builders (developers) can work independently without the city turning into chaos.

---

## What they expect

- **Justify decisions with trade-offs**, not trends: "We chose server components for product pages because they remove JavaScript from the client and improve LCP. The trade-off is that interactive parts need clear client boundaries."
- **Design for change:** features can be added, removed or rewritten without touching everything.
- **Design for teams:** several developers (or teams) work in parallel without stepping on each other.
- **Write decisions down:** Architecture Decision Records (ADRs), diagrams, a README for "how we build things here".
- **Stay hands-on:** build the first slice of a feature to prove the pattern.
- **Evolve:** migrate safely (pages router → app router, CRA → Vite/Next, JS → TS) in small steps.

---

## Folder structure

**Organise by feature (domain), not by file type**, so related code stays together and features stay independent:

```
❌ By type (gets messy at scale)        ✅ By feature
src/                                     src/
  components/  (200 files)                app/                    ← Next.js routes only (thin)
  hooks/                                    (shop)/products/[slug]/page.tsx
  services/                                 (shop)/cart/page.tsx
  utils/                                  features/
                                            product/
                                              components/ ProductCard.tsx, Gallery.tsx
                                              api/        getProduct.ts
                                              hooks/      useProductVariants.ts
                                              types.ts
                                              index.ts    ← public API of the feature
                                            cart/
                                            checkout/
                                            search/
                                          shared/
                                            ui/          ← design-system components (Button, Modal)
                                            lib/         ← fetch client, formatters, analytics
                                            config/
```

**Rules that keep it scalable:**

1. **Features import from `shared`, never from each other's internals.** Use the feature's `index.ts` public API.
2. **`app/` route files stay thin:** they compose feature components and fetch data.
3. **Enforce boundaries with ESLint** (`eslint-plugin-boundaries`, `import/no-restricted-paths`), or with Nx module boundary rules.

---

## State strategy

**The biggest architecture mistake is putting everything in one global store.** Split state by type:

| Type | Example | Tool |
|---|---|---|
| **Server state** (data from APIs) | products, cart, orders | **Server components** + Next.js caching, or **TanStack Query** on the client |
| **URL state** | filters, sort, page, search query, selected tab | `searchParams` / `useSearchParams` |
| **Global client state** | theme, mini-cart open, feature flags | **Context** (rarely changes) or **Zustand/Redux Toolkit** (frequent updates) |
| **Local UI state** | input values, open/closed, hover | `useState` / `useReducer` in the component |
| **Form state** | checkout form | React Hook Form + zod, or React 19 form actions |

**Rule: colocate state as low as possible, and don't copy server data into a client store.** That creates two sources of truth.

---

## Data fetching layers

```
UI components
     │  (props / hooks)
     ▼
features/*/api  ← typed functions: getProduct(slug), addToCart(item)
     │
     ▼
shared/lib/http ← one fetch wrapper: base URL, auth headers, timeouts, retries, error mapping, logging
     │
     ▼
BFF / commerce APIs
```

- **Components never call `fetch` with raw URLs.** They use typed functions from the feature's `api/`.
- **One HTTP client** handles auth, retries, timeouts and error normalisation.
- **Validate API responses** at the boundary (zod), so bad data fails loudly in one place.
- **Map backend shapes to UI types** (an "anti-corruption layer"), so a commerce platform change touches only the mapping, not 200 components.

---

## Design system

- **Design tokens** (colours, spacing, typography, radii) shared between Figma and code, often as CSS variables.
- **Accessible base components** (Button, Input, Select, Modal, Tabs), built on headless primitives (Radix, React Aria) so keyboard and screen reader behaviour is correct.
- **Storybook** for documentation, visual review and visual regression tests.
- **Versioned as a package** in the monorepo, used by every app.

---

## Monorepo or micro-frontends?

| | **Single app** | **Monorepo** (Turborepo / Nx) | **Micro-frontends** (Module Federation, multi-zones) |
|---|---|---|---|
| What | one repo, one deployable | several apps and packages in one repo, shared code, builds cached | separately built and **deployed** apps composed at runtime or by route |
| Good for | 1–2 teams | several apps sharing a design system and libraries | **many independent teams** that must release on their own schedule |
| Cost | lowest | moderate (tooling) | **high**: runtime integration, version skew, duplicated dependencies, harder testing |

**Architect answer:** "Start with a well-structured monolith or monorepo with strict module boundaries. Only move to micro-frontends when independent deployment by many teams is a real requirement, because they solve an **organisational** problem and add runtime complexity." With Next.js, **multi-zones** (different apps owning different routes, like `/shop` and `/blog`) is a lighter alternative.

---

## Documenting decisions

**Architecture Decision Record (ADR):** a short markdown file per big decision, kept in the repo:

```md
# ADR 007: Use TanStack Query for client-side server state

## Status
Accepted (2026-09-12)

## Context
Cart and wishlist are updated from many components; we had duplicated fetch logic,
stale data after mutations, and no retry/caching.

## Decision
Use TanStack Query for client-side server state. Server components remain the default
for initial page data.

## Consequences
+ Caching, deduplication, retries, optimistic updates out of the box
+ One pattern for mutations
- New dependency (~13 KB gzip), team needs training
- Must define query-key conventions (see docs/query-keys.md)
```

**Also keep:** a C4-style diagram (context → containers → components), a "how to add a feature" guide, and an up-to-date README.

---

## Cross-cutting concerns

| Concern | Typical architecture choice |
|---|---|
| **Auth** | HttpOnly session cookies, checked on the server (`proxy.ts` / server components) |
| **i18n** | Locale in the route (`/en-gb/...`), message catalogues, `Intl` for money and dates |
| **Feature flags** | LaunchDarkly / Unleash / Statsig: release safely, A/B test |
| **Error handling** | Error boundaries per route segment (`error.tsx`), Sentry for tracking |
| **Analytics** | One `track()` wrapper, a consent-aware event layer |
| **Observability** | Real-user monitoring for Core Web Vitals, logs with request IDs through the BFF |
| **Security** | CSP headers, no secrets in client env, dependency scanning |

---

## What to learn

- ✅ **Next.js App Router** deeply: layouts, server and client components, caching, route handlers, `proxy.ts`.
- ✅ **State categories** and the tools for each (TanStack Query, Zustand, Redux Toolkit, URL state).
- ✅ **Feature-based structure** and enforcing boundaries with ESLint or Nx.
- ✅ **Monorepos** (Turborepo or Nx): workspaces, shared packages, build caching.
- ✅ **When micro-frontends make sense**, and when they don't.
- ✅ **Design systems:** tokens, headless UI libraries, Storybook.
- ✅ **Writing ADRs** and C4 diagrams.
- ✅ **Migration strategies:** the strangler pattern, incremental adoption.

---

## Interview questions

**Q: How would you structure a large React/Next.js app?**
Feature-based folders with a shared UI library, thin route files, typed API layers per feature, and lint-enforced boundaries. A monorepo if several apps share code.

**Q: How do you decide on state management?**
I classify the state first: server data with server components or TanStack Query, URL state for filters, small global state with Context or Zustand, and everything else local. A big global store is rarely needed.

**Q: Monorepo vs micro-frontends?**
A monorepo gives code sharing and consistency with one deploy. Micro-frontends give independent deploys but add runtime complexity, so I'd only use them for many autonomous teams.

**Q: How do you make sure the team follows the architecture?**
Documented ADRs and examples, lint rules for boundaries, templates and generators, code reviews, and pairing on the first features.

**Q: How do you migrate a legacy app without stopping feature work?**
The strangler approach: new routes or features in the new stack, migrated page by page behind flags, with shared components bridged and metrics compared.

---

## 🎯 Interview answer

> "When I define a front-end architecture, I start from the product's needs: for headless e-commerce that means SEO, fast mobile performance and many teams working in parallel. I'd use Next.js with the App Router, server components by default and client components only for interactive pieces, choosing static, incremental or dynamic rendering per route. The code is organised by feature, with thin route files, typed API modules behind a single HTTP client that validates and maps commerce responses, and a shared design-system package built on accessible headless primitives and design tokens. For state, I separate server state, handled by server components or TanStack Query, URL state for filters, and small client state in Context or Zustand. Boundaries are enforced with lint rules and, if there are several apps, a Turborepo or Nx monorepo; I only consider micro-frontends when independent deployment for many teams is a real need. Cross-cutting concerns like auth, i18n, feature flags, error tracking and real-user monitoring are designed in from the start, and every major decision goes into an ADR with its trade-offs, so the team understands and can follow the architecture."
