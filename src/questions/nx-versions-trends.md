## Quick answer

**Next.js has a major release roughly every October**, at or near Next.js Conf, with minor releases (x.1, x.2…) in between.
- **Current version: Next.js 16.4** (October 2026). Next.js 17 is expected to make **Cache Components** the default.
- **The big eras:**
  1. **Pages Router + SSR/SSG/ISR** (Next.js 9–12, 2019–2022)
  2. **The App Router + React Server Components** (13–15, 2022–2024)
  3. **Explicit caching + Partial Prerendering + Turbopack** (16, 2025–2026)
- **The trend now:** "dynamic by default, cache explicitly". Also SPA-like **instant navigations** from a server-first model, Rust tooling, AI-agent integration, platform portability, and stronger competition (React Router v7, TanStack Start, Astro).

---

## Version timeline

**Dates are from the official Next.js release posts where available.**

| Version | Released | Headline changes |
|---|---|---|
| **1.0** | Oct 2016 | Zero-config server-rendered React, file-based `pages/` routing |
| **9** | 2019 | **API Routes** (`pages/api`), dynamic routes `[id]`, automatic static optimisation, built-in TypeScript |
| **9.3** | 2020 | **`getStaticProps` / `getStaticPaths` / `getServerSideProps`**: SSG becomes first-class |
| **9.5** | 2020 | **Incremental Static Regeneration (ISR)** stable (`revalidate`) |
| **10** | 27 Oct 2020 | **`next/image`** with automatic optimisation, **i18n routing**, `fallback: 'blocking'`, `notFound`/`redirect` in data functions, React 17 |
| **11** | 2021 | webpack 5 by default, `next/script` |
| **12** | 26 Oct 2021 | **Rust compiler (SWC)**: ~5× faster builds; **Middleware (beta)**; React 18 support; AVIF images; RSC (alpha) |
| **12.1 / 12.2** | Feb / 28 Jun 2022 | **On-demand ISR** (`res.revalidate`), then **stable Middleware** and on-demand ISR |
| **13** | 25 Oct 2022 | **App Router (`app/`, beta)** built on React Server Components; nested layouts; streaming; **Turbopack (alpha)**; `next/font` |
| **13.4** | 4 May 2023 | **App Router stable**; Turbopack beta; Server Actions (experimental) |
| **14** | 26 Oct 2023 | **Server Actions stable**; Partial Prerendering (preview); faster Turbopack dev; Node 18.17+; `next export` removed (→ `output: 'export'`) |
| **15** | 21 Oct 2024 | **React 19**; **async request APIs** (`await cookies()`, `params`); **caching defaults flipped** (`fetch`, `GET` handlers and client navigations no longer cached); Turbopack dev stable; `next/form`; `instrumentation.ts` stable; `next.config.ts`; Server Action security (unguessable IDs) |
| 15.x | 2024–2025 | `after()` stable, Turbopack builds (beta), typed routes and `PageProps` helpers |
| **16** | 21 Oct 2025 | **Cache Components** (`"use cache"`, PPR); **`proxy.ts`** replaces middleware; **Turbopack default** for dev and build; React Compiler support (stable); `updateTag` / `refresh` / `revalidateTag(tag, profile)`; sync request APIs removed; AMP and `next lint` removed; Node 20.9+ |
| **16.1** | 18 Dec 2025 | **Turbopack file-system cache for `next dev` (stable, on by default)**; Bundle Analyzer (experimental); `next dev --inspect`; `next upgrade` command |
| **16.2** | 18 Mar 2026 | **Adapters API stable**; ~400% faster dev startup; ~50% faster rendering (faster RSC payload parsing); hydration diff indicator; `AGENTS.md` in `create-next-app`; `unstable_catchError`, `unstable_retry` |
| **16.3** | 3 Aug 2026 | **Instant Navigations** (Instant Insights, **Partial Prefetching**, Navigation Inspector, the `instant()` Playwright helper); up to 90% less dev memory; build cache by default; **native Node.js streams (up to 22% more requests under load)**; TypeScript 7 type checking; `catchError` and `retry` stable; root params (`next/root-params`); `import.meta.glob`; experimental Rust React Compiler and offline support |
| **16.4** | 6 Oct 2026 | **Cache Components recommended for every app, and enabled by default in `create-next-app`**; `ensureStatic`; `navigation()` / `prefetch()` to control what's prefetched; `next upgrade --agent`; React 19.3; smaller bundles and disk cache |
| **17** (upcoming) | — | Announced: **Cache Components becomes the default**; the `cacheComponents` / `partialPrefetching` flags go away |

**Node.js minimums:** 12.22 (Next 12) → 18.17 (14) → 18.18 (15) → **20.9 (16)**.

---

## Major changes in Next.js 16

**What changed for everyday code:**

| Area | Before (14/15) | Now (16.x) |
|---|---|---|
| **Caching model** | Implicit: Next 14 cached `fetch` by default; Next 15 stopped; config spread across `fetch` options, `revalidate` and `dynamic` exports | **Explicit and opt-in:** `"use cache"` + `cacheLife` + `cacheTag`, with dynamic by default (Cache Components) |
| **Static vs dynamic** | Per route: one `cookies()` made the whole page dynamic | **Per component:** Partial Prerendering builds a static shell + streams dynamic parts |
| **Invalidation** | `revalidateTag(tag)`, `revalidatePath` | `revalidateTag(tag, 'max')` (SWR), **`updateTag`** (read-your-writes), **`refresh()`** |
| **Request APIs** | Sync access allowed (with warnings in 15) | **Must `await`** `params`, `searchParams`, `cookies()`, `headers()` |
| **Middleware** | `middleware.ts` (Edge runtime) | **`proxy.ts`** (Node.js runtime) |
| **Bundler** | webpack default; Turbopack opt-in for dev | **Turbopack default** for dev and build, with disk caching |
| **Navigations** | Per-link prefetch requests; `loading.tsx` needed for instant feedback | **Instant Navigations:** one reusable shell per route (Partial Prefetching), with dev insights for slow routes |
| **Errors** | `error.tsx` with `reset()` | `retry()` (re-fetches server data) + **`catchError()`** for component-level boundaries |
| **Images** | `priority` | **`preload`**; safer defaults (`qualities: [75]`, `localPatterns`, a 4 h cache TTL) |
| **Linting** | `next lint` | Run ESLint (flat config) or Biome directly |
| **Deploying elsewhere** | Community adapters | **Official Adapter API** (stable in 16.2) + an adapter test suite |

**How to upgrade:** `npx @next/codemod@canary upgrade latest` or `next upgrade` (16.1+), or let a coding agent run `npx next@canary upgrade --agent=latest` (16.4). Then follow the version guide (async APIs, `proxy.ts`, `default.js` for parallel slots, image config).

---

## Trends right now

**1. "Dynamic by default, cache explicitly."** The App Router's original implicit caching confused many teams. The 16.x line resets the model: nothing is cached unless you say `"use cache"`, and the static shell comes from Partial Prerendering. Next.js 17 makes it the default.

**2. Server-first, but SPA-fast.** Server Components were criticised for slow-feeling navigations. 16.3's **Instant Navigations** (prefetched route shells, client-side caching through `cacheLife`'s `stale` time, dev tooling that flags blocking routes) aim for SPA responsiveness without giving up the server model.

**3. Rust and native tooling everywhere:**
- Turbopack is the default bundler, with persistent disk caching for dev and build.
- An experimental Rust React Compiler.
- TypeScript 7 (the native Go port) for type checking.
- Native Node.js streams for server rendering.

**4. The React Compiler goes mainstream.** It has built-in support (`reactCompiler: true`), so manual `useMemo`/`useCallback` matters less.

**5. AI-agent-native development:**
- Next.js DevTools MCP.
- A version-matched `AGENTS.md` written by `next dev`.
- Paste-ready fix prompts in errors, and first-party Skills.
- `next upgrade --agent`.
- Many AI products themselves run on Next.js: the official showcase lists **OpenAI** and **Claude** alongside Nike, NerdWallet, Netflix Jobs, Zapier, Sonos and Solana.

**6. Portability and less lock-in.** The stable **Adapter API** (16.2), the OpenNext project and platform adapters, the documented self-hosting requirements (shared cache handlers, encryption keys, `deploymentId`) and immutable assets shared across deploys (16.3). All of this answers the criticism that Next.js works best only on Vercel.

**7. Security as a first-class topic.** After the middleware-bypass CVE (2025-29927) and the critical React Server Components RCE ("React2Shell", CVE-2025-55182, Dec 2025), teams treat Server Actions as public endpoints, keep authorisation in a data access layer, and patch quickly. Next.js 16.4 adds `experimental.agentUpgrade: 'security'` reminders.

**8. More competition, and RSC spreading beyond Next.js:**
- **React Router v7** (Remix merged into it) offers a framework mode with loaders, actions and SSR.
- **TanStack Start** (type-safe, Vite-based) grew fast in 2026.
- **Astro** leads for content sites.
- React Server Components are no longer Next-only: the React advisory for CVE-2025-55182 listed React Router, Waku, Parcel RSC and Vite's RSC plugin as affected implementations too.

**npm downloads in one month (Sep 2026, from the npm registry API):**

| Package | Sep 2026 | Oct 2025 |
|---|---|---|
| `next` | ~243 M | ~65 M |
| `react-router` (library + framework) | ~224 M | ~83 M |
| `@tanstack/react-start` | ~65 M | ~0.5 M |
| `astro` | ~24 M | ~3.8 M |

**Downloads aren't users.** All packages grew sharply in 2026, which is probably partly driven by CI pipelines and AI coding agents scaffolding projects. Use the numbers for **relative** trends only: Next.js remains the most-downloaded React meta-framework, and TanStack Start grew fastest from a small base.

---

## How to talk about versions in interviews

- **State the version you're answering for:** "In Next.js 16 with Cache Components… in 14 this was different because fetch was cached by default."
- **Know the three caching eras:** 14 (implicit caching), 15 (uncached defaults, async APIs), 16 (explicit `"use cache"` + PPR).
- **Know the renames:** `middleware.ts` → `proxy.ts`, `priority` → `preload`, `unstable_cacheLife` → `cacheLife`, `experimental.dynamicIO` → `cacheComponents`, `getStaticProps` → Server Components + `"use cache"`.
- **Mention upgrade tooling:** codemods, `next upgrade`, the version guides, and incremental adoption flags.
- **Be balanced about trends:** Next.js is still the default React framework with the biggest ecosystem, but alternatives exist for teams that want a lighter model (React Router, TanStack Start) or content-first sites (Astro).

---

## Interview Q&A

**Q: What's the latest Next.js version and what are its key features?**
Next.js 16.4 (October 2026): Cache Components is recommended for all apps and enabled in new projects, plus `ensureStatic`, prefetch-control APIs, React 19.3, agent upgrade tooling and smaller bundles. It builds on 16.0's `"use cache"`, Partial Prerendering, `proxy.ts` and default Turbopack, and 16.3's Instant Navigations.

**Q: What changed in caching between Next.js 14, 15 and 16?**
14 cached `fetch` and `GET` handlers by default; 15 made them uncached by default and made request APIs async; 16 introduced Cache Components: dynamic by default with explicit `"use cache"`, `cacheLife` and `cacheTag`, plus new invalidation APIs.

**Q: When did the App Router become stable?**
Next.js 13.4 (May 2023), after being introduced in beta in 13.0 (October 2022).

**Q: What are the current trends in the Next.js ecosystem?**
Explicit caching and PPR, SPA-like instant navigations in a server-first model, Rust-based tooling, the React Compiler, AI-agent integration, deployment portability through adapters, a security focus after the 2025 CVEs, and competition from React Router v7, TanStack Start and Astro.

---

## 🎯 Interview answer

> "Next.js has a major release roughly every October, and I think of it in three eras. Versions 9 to 12 were the Pages Router era, with `getStaticProps` and `getServerSideProps` in 9.3, ISR in 9.5, `next/image` in 10, and the SWC compiler and middleware in 12. Versions 13 to 15 introduced the App Router on React Server Components, stable in 13.4, Server Actions stable in 14, and React 19, async request APIs and uncached-by-default `fetch` in 15. Version 16, from October 2025, brought Cache Components with `use cache` and Partial Prerendering, `proxy.ts` replacing middleware, Turbopack as the default bundler, and `updateTag` and `refresh`. The 16.x minors added disk caching, a stable Adapter API, Instant Navigations with Partial Prefetching in 16.3, and in 16.4 the recommendation that every app uses Cache Components, which becomes the default in 17. The trends I'd highlight are explicit 'dynamic by default, cache what you choose' caching, SPA-like navigations from a server-first model, Rust tooling and the React Compiler, AI-agent tooling, portability beyond Vercel, a strong security focus after the 2025 CVEs, and real competition from React Router v7, TanStack Start and Astro. In interviews I always say which version my answer applies to."
