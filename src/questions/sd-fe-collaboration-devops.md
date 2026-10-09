## What the JD says

> "**Collaborate closely with backend, UX, and DevOps teams**" · "collaborate with product, design, and backend teams" · "collaboration on full-stack solution design"

---

## What it means

**An architect sits where teams meet.** Most front-end delays and bugs come from the **gaps between teams**:

- **An API that changed without notice.**
- **A design that can't be built as drawn.**
- **A deployment that broke because environment variables differed.**

**Your job is to design those interfaces between teams**, just like interfaces between components.

| Team | You agree on | Artifacts |
|---|---|---|
| **Backend** | API contracts, error formats, auth, caching, performance budgets | OpenAPI/GraphQL schema, shared types, mocks, ADRs |
| **UX / Design** | Design system, tokens, states, responsive rules, accessibility | Figma library + tokens, Storybook, design QA |
| **DevOps / Platform** | Build, deploy, environments, monitoring, scaling | CI/CD pipelines, Dockerfile, infrastructure config, dashboards and alerts |
| **Product / QA** | Scope, acceptance criteria, priorities, quality bar | User stories, Definition of Done, test strategy |

**Analogy: an orchestra conductor** 🎻 Each section (strings, brass) is excellent alone. The conductor makes sure they play the same piece, in time and in tune.

---

## Working with backend

### Contract-first APIs

1. **Design the API together** for the page's needs (avoid 6 calls for one page, or 5 MB responses).
2. **Write it down:** OpenAPI for REST, or a GraphQL schema.
3. **Generate types and clients** from it (`openapi-typescript`, `orval`, GraphQL Codegen), so the front and back end can't drift.
4. **Mock it** (MSW) so both sides work in parallel.
5. **Contract tests** (Pact) or schema checks in CI catch breaking changes.

```yaml
# openapi.yaml (excerpt)
/cart/items:
  post:
    requestBody:
      content:
        application/json:
          schema: { $ref: '#/components/schemas/AddToCartRequest' }
    responses:
      '200': { content: { application/json: { schema: { $ref: '#/components/schemas/Cart' } } } }
      '409': { description: Item out of stock, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
```

```ts
// MSW: the same mock powers local dev, Storybook and tests
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/cart/items', async ({ request }) => {
    const item = await request.json()
    return HttpResponse.json({ id: 'cart_1', items: [item], total: { amount: 49.99, currency: 'GBP' } })
  }),
]
```

**Also agree:**

- **One error format** (e.g. RFC 9457 Problem Details: `{ type, title, status, detail }`).
- **Pagination style.**
- **Auth** (cookies vs tokens).
- **API versioning and deprecation.**
- **Caching headers.**
- **Rate limits.**
- **Timeouts.**

---

## Working with UX

- **Design tokens as the single source:** Figma variables exported to code (Style Dictionary / Tokens Studio), so colours, spacing and type never drift.
- **Component parity:** every Figma component has a matching coded component in **Storybook**, with the same names and variants.
- **Early feasibility reviews:** join design reviews to flag performance, accessibility and technical costs **before** the design is final.
- **Design QA:** designers review the PR's preview deployment (Vercel/Netlify preview URLs) before merge.
- **Shared language:** states (loading, empty, error), breakpoints, motion rules, accessibility annotations.

---

## Working with DevOps

### CI/CD pipeline for a Next.js storefront

```yaml
# .github/workflows/ci.yml (simplified)
name: CI
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'npm' }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build
      - run: npx playwright install --with-deps && npm run test:e2e
      - run: npx lhci autorun          # performance + accessibility budgets
```

**Pipeline stages:**

```
PR → lint/typecheck/test → build → preview deployment → E2E + Lighthouse on the preview
   → review + design QA → merge → deploy to staging → smoke tests → production (canary / gradual) → monitor
```

### Environments & configuration

- **Environments:** dev → staging (production-like data and config) → production.
- **Config via environment variables**, validated at startup with zod. Secrets live in the platform's secret store, never in `NEXT_PUBLIC_*`.
- **Build once, deploy the same artifact** everywhere where possible.

### Deployment options for Next.js

| Option | Notes |
|---|---|
| **Vercel** | Zero-config, preview URLs, edge network, ISR/caching handled for you |
| **Self-hosted Docker** (Kubernetes, ECS, Azure) | `output: 'standalone'` for small images; you configure the CDN, the image optimisation cache, and a shared cache handler for ISR across instances |
| **Other platforms** | Netlify, AWS Amplify, Cloudflare (via adapters / OpenNext) |

```dockerfile
# Dockerfile (Next.js standalone output)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

### Safe releases

- **Feature flags:** merge unfinished work safely, roll out to 5% → 50% → 100%, kill switch.
- **Canary or blue-green deployments**, with automatic rollback when error rates spike.
- **Observability:** error tracking (Sentry), RUM Core Web Vitals, logs with request IDs from the browser → BFF → services (OpenTelemetry tracing), dashboards and alerts.
- **Incidents:** runbooks, on-call, and blameless post-mortems.

---

## Working with product & QA

- **Refinement:** join backlog refinement to shape stories and estimate.
- **Definition of Ready / Done**, agreed together.
- **Test strategy:** who tests what (developer unit and component tests, QA exploratory testing, shared Playwright suites).
- **Trade-off conversations** in business terms: "Adding live stock on listing pages costs about 300ms of TTFB, so let's show it on product pages only."

---

## Collaboration habits

- **Over-communicate API and contract changes:** changelogs, deprecation periods.
- **Write things down:** ADRs, RFCs, diagrams. Decisions shouldn't live only in meetings.
- **Joint ownership** of end-to-end quality (shared dashboards, shared on-call for the storefront).
- **Disagree with data:** performance numbers, analytics, user research.
- **Be the translator** between business language and technical language.

---

## What to learn

- ✅ **OpenAPI and GraphQL schemas**, code generation for types, MSW mocking, contract tests (Pact).
- ✅ **API design basics:** REST conventions, error formats (Problem Details), pagination, versioning, idempotency.
- ✅ **Design tokens pipeline** (Figma variables → Style Dictionary), Storybook, design QA with preview deployments.
- ✅ **CI/CD:** GitHub Actions / Azure DevOps / GitLab CI pipelines, caching, quality gates.
- ✅ **Docker for Next.js** (standalone output), environment config, secrets.
- ✅ **Feature flags**, canary and blue-green releases, rollbacks.
- ✅ **Observability:** Sentry, RUM, OpenTelemetry tracing, dashboards and alerts.
- ✅ **Agile ceremonies** and stakeholder communication.

---

## Interview questions

**Q: How do you work with backend teams to avoid integration issues?**
Contract-first APIs with OpenAPI or a GraphQL schema, generated types, MSW mocks so we work in parallel, contract tests in CI, and agreed error and versioning conventions.

**Q: How do you keep design and code consistent?**
Shared design tokens from Figma to code, a component library in Storybook mirroring the Figma library, early feasibility reviews, and design QA on preview deployments.

**Q: What does your CI/CD pipeline look like?**
Lint, typecheck, unit tests, build, preview deployment, Playwright and Lighthouse checks on the preview, review, then staged production rollout with feature flags, monitoring and automatic rollback.

**Q: How would you deploy Next.js outside Vercel?**
Docker with standalone output, behind a CDN, with a shared cache handler for ISR across instances, image optimisation configured, and health checks.

---

## 🎯 Interview answer

> "I see collaboration as designing the interfaces between teams. With backend, we work contract-first: we design APIs around page needs, write them as OpenAPI or a GraphQL schema, generate TypeScript types and clients so we can't drift, mock them with MSW so both sides work in parallel, and add contract checks in CI; we also agree error formats, pagination, versioning and caching. With UX, design tokens flow from Figma variables into code, every Figma component has a Storybook counterpart, I join design reviews early to flag performance and accessibility costs, and designers do QA on preview deployments. With DevOps, I help define the pipeline (lint, typecheck, tests, build, preview environments with Playwright and Lighthouse checks), then gradual production releases behind feature flags with monitoring and rollback, plus observability through Sentry, real-user Core Web Vitals and tracing with request IDs. Throughout, I write decisions down in ADRs and discuss trade-offs with data in business terms."
