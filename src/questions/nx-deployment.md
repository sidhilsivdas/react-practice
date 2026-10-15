## Quick answer

**Next.js can be deployed in several ways:**

| Option | Feature support | Notes |
|---|---|---|
| **Vercel** (the company behind Next.js) | Everything, zero configuration | Managed CDN, ISR, image optimisation, previews |
| **Node.js server** (`next build && next start`) | **All features** | A VM or container behind a reverse proxy (nginx) |
| **Docker** (`output: 'standalone'`) | **All features** | Kubernetes, ECS, Cloud Run, Fly.io… |
| **Other platforms via adapters** | Depends on the adapter | **Adapter API stable since 16.2**; OpenNext for AWS, Netlify, Cloudflare… |
| **Static export** (`output: 'export'`) | **Static only** | Any static host (S3, GitHub Pages). No server features. |

**Self-hosting with multiple instances needs extra care:**
- a **shared cache** with tag coordination
- the **same Server Actions encryption key** on every instance
- a **`deploymentId`** against version skew
- **no response buffering** (for streaming)
- **one build** promoted across environments

---

## Running on Node.js / Docker

```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',      // .next/standalone: server.js + only the node_modules it needs
}
```

```dockerfile
# Dockerfile (multi-stage)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build                                   # next build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./           # server.js + minimal node_modules
COPY --from=build /app/.next/static ./.next/static    # hashed JS/CSS (not included in standalone)
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

**Production essentials:**
- **A reverse proxy** (nginx, a load balancer) in front: TLS, request size limits, slow-client protection, rate limiting.
- **Static assets** are hashed and served with `Cache-Control: public, max-age=31536000, immutable`. Put a CDN in front (`assetPrefix` for a separate CDN domain).
- **Image optimisation** works with `next start` out of the box (it uses `sharp`), or set a custom `loader` for an image CDN.
- **Graceful shutdown:** handle `SIGTERM` and allow a drain period, so in-flight requests and `after()` callbacks finish.
- **`instrumentation.ts`** (`register()`) for OpenTelemetry tracing and startup code.
- **Node.js 20.9+** is required by Next.js 16.

---

## Multi-instance pitfalls

**"It works locally but breaks with 3 pods."** The classic senior question.

| Problem | Why | Fix |
|---|---|---|
| **Stale or inconsistent pages** | Each instance has its **own in-memory/disk cache**; `revalidateTag` on pod A doesn't clear pods B and C | A **shared cache handler** (Redis): `cacheHandler` for ISR/route cache, `cacheHandlers` + **`"use cache: remote"`** for Cache Components, `cacheMaxMemorySize: 0`, and implement **`refreshTags()`** for tag coordination |
| **"Failed to find Server Action"** | Each build/instance generated a **different encryption key** for action closures | Set **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** (base64, 16/24/32 bytes), the same for all instances |
| **Broken navigations during rolling deploys** (**version skew**) | Old clients request JavaScript chunks or call Server Actions that the new build doesn't have | Set **`deploymentId`**: assets get `?dpl=…`, navigations send `x-deployment-id`, and a mismatch triggers a hard reload. Or keep old assets available (immutable assets on a CDN). |
| **Different build IDs per environment** | Rebuilding per stage | **Build once**, promote the same image; `generateBuildId` from the git SHA if needed |
| **Streaming doesn't stream** | nginx or a load balancer **buffers** the response | `X-Accel-Buffering: no`, load balancers with chunked/HTTP-2 support |
| **Sessions in memory** | Sticky to one pod | Store sessions in cookies or a shared store |

---

## Environment variables

| Variable | Available | When it's resolved |
|---|---|---|
| `DATABASE_URL`, `API_SECRET` (no prefix) | **Server only** | At **runtime** (when read during request-time rendering, after `connection()` or with cookies/headers), or at build time if read during prerendering |
| `NEXT_PUBLIC_API_URL` | **Server + browser** | **Inlined into the JavaScript bundle at build time** |

**Consequences:**
- **`NEXT_PUBLIC_` values are frozen in the build.** Changing them needs a rebuild, and they're visible to everyone, so never put secrets there.
- **For one Docker image used in staging and production,** read config on the server at runtime and pass it to the client as props (or through a small config endpoint), instead of `NEXT_PUBLIC_`.
- **Files:** `.env`, `.env.local` (git-ignored, for secrets), `.env.development` and `.env.production`. `.env.local` overrides the others.
- **`serverRuntimeConfig` / `publicRuntimeConfig` were removed in Next.js 16.** Use environment variables.

---

## Runtimes: Node.js vs Edge

| | **Node.js runtime** (default) | **Edge runtime** |
|---|---|---|
| APIs | Full Node.js (fs, crypto, native packages, database drivers) | Web APIs only (subset), no native modules |
| Cold start / location | Regular servers or serverless functions | Fast starts, close to users |
| Next.js 16 | `proxy.ts` runs here; **Cache Components requires Node.js** | `runtime = 'edge'` is being phased out for these features; `middleware.ts` (deprecated) remains for Edge use cases |
| Choose for | **Almost everything** | Very small, latency-critical logic, if your platform benefits |

**Red flag in interviews:** choosing Edge "because it's faster" without checking the constraints. The data source is usually in one region anyway, so a function far from the database is often **slower**.

---

## Static export

```ts
const nextConfig: NextConfig = { output: 'export' }   // `next build` produces an `out/` folder of HTML/CSS/JS
```

**Works:** Server Components rendered at build time, static routes, `generateStaticParams` for dynamic routes, client-side fetching, `next/image` **with a custom loader**.

**Doesn't work:** request-time rendering, Server Actions, Proxy, ISR/revalidation, cookies and headers, Route Handlers other than static `GET`, the default image optimisation, and dynamic routes without `generateStaticParams`.

**Good for:** documentation, marketing sites and blogs on S3, GitHub Pages or a CDN.

---

## CI/CD & observability

**Pipeline:** `npm ci` → lint → `tsc --noEmit` (or `next typegen` first for route types) → unit tests → `next build` → E2E tests (Playwright against `next start`) → deploy **the same artefact** → smoke tests.

- **Preview deployments per pull request** (Vercel, or ephemeral environments) for review and QA.
- **Monitoring:** error tracking (Sentry; `error.digest` matches server logs), real-user Core Web Vitals, OpenTelemetry traces through `instrumentation.ts`, cache hit rates, Server Action failure rates.
- **Upgrades:** `npx @next/codemod@canary upgrade latest`, or `next upgrade --agent` (16.4) for AI-assisted upgrades. Read the version upgrade guides; apply security releases quickly.

---

## Interview Q&A

**Q: How do you deploy Next.js outside Vercel?**
Run `next build` + `next start` on Node.js, usually in Docker with `output: 'standalone'`, behind a reverse proxy and CDN, or use a platform adapter (OpenNext, the stable Adapter API in 16.2). Static export only works for fully static sites.

**Q: What breaks with multiple instances?**
Per-instance caches (need a shared cache handler and tag coordination), Server Action encryption keys (share `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`), version skew during rolling deploys (`deploymentId`), and buffering proxies that break streaming.

**Q: Node.js or Edge runtime?**
Node.js by default, since it has full APIs, Cache Components requires it, and `proxy.ts` uses it. Edge only for small, latency-critical logic whose constraints you've checked.

**Q: What's the difference between `NEXT_PUBLIC_` and other env vars?**
`NEXT_PUBLIC_` variables are inlined into the client bundle at build time and are public. Others are server-only and can be read at runtime.

**Q: What changes between local development and production?**
Dev compiles on demand and shows overlays and insights, with no real prefetching and no production caching behaviour; production uses optimised prerendered output, prefetching, caching and minified bundles. That's why you test with `next build && next start` before deploying.

---

## 🎯 Interview answer

> "Next.js runs with full features on Vercel, on any Node.js server with `next build` and `next start`, or in Docker using `output: 'standalone'`. I use a multi-stage image copying the standalone server, `.next/static` and `public`, behind a reverse proxy and a CDN for hashed immutable assets, with graceful shutdown and OpenTelemetry through `instrumentation.ts`. Platform adapters and OpenNext cover other hosts, and static export only suits fully static sites, since it has no request-time rendering, Server Actions, Proxy or ISR. With multiple instances I plan for four things: a shared cache handler in Redis with tag coordination via `refreshTags`, plus `use cache: remote` for Cache Components; the same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` everywhere; a `deploymentId` so version skew during rolling deploys triggers a hard reload; and proxies configured not to buffer streams. I build once and promote the same image, keep secrets in server-only runtime env vars, and remember that `NEXT_PUBLIC_` values are public and inlined at build time. I default to the Node.js runtime, which Cache Components and `proxy.ts` require, use Edge only after checking its constraints, and run E2E tests against a production build in CI."
