## What the JD says

> "**Development of Node.js/Fastify services, focused on performance and scalability**" · "contribute to backend development where needed, particularly around **Node.js services, API integration**, and collaboration on full-stack solution design"

---

## What it means

**Fastify is a fast, low-overhead web framework for Node.js**, an alternative to Express. In this role you'd likely use it for:

- **A BFF (backend-for-frontend):** aggregating commerce, CMS, search and pricing APIs into page-shaped responses for the web and mobile apps.
- **Integration services:** wrapping a vendor API, handling webhooks, syncing data.
- **Performance-critical APIs:** cart, pricing, availability, with caching.

**Why Fastify instead of Express?**

| | **Express** | **Fastify** |
|---|---|---|
| Speed | slower (benchmarks often show roughly half Fastify's requests per second) | among the fastest Node frameworks |
| Validation | add-ons (Joi, zod middleware) | **built-in JSON Schema validation** (Ajv), before your handler runs |
| Serialisation | `JSON.stringify` | **schema-based fast serialisation**, which also **strips undeclared fields** |
| Async/await | added later; errors in async handlers need care (fixed in Express 5) | native: return a value or throw |
| Structure | middleware chain | **plugins with encapsulation**, hooks, decorators |
| Logging | add-on | **Pino** built in (fast, structured JSON logs) |
| TypeScript | community types | first-class: type providers (TypeBox, zod) |

**Current version:** **Fastify v5** (2024), which **requires Node.js 20+** and is stricter about JSON schemas (no shorthand schemas).

**Analogy: a well-organised airport** ✈️ Express is a long security corridor everyone walks through (the middleware chain). Fastify has separate, self-contained terminals (plugins), automatic passport checks at the door (schema validation), and a fast baggage system (serialisation).

---

## What they expect

- **Build a production-grade service:** routes, schemas, plugins, error handling, logging, config, tests.
- **Performance:** schemas for validation **and** serialisation, async I/O, connection pooling, caching, no blocking code.
- **Scalability:** stateless instances, horizontal scaling (containers or cluster), Redis for shared state and cache, graceful shutdown.
- **Integration:** calling upstream APIs well (timeouts, retries, circuit breakers, parallel calls), and webhooks.
- **Security:** helmet, CORS, rate limiting, auth, input validation, secrets.
- **Observability:** structured logs, request IDs, metrics, tracing, health checks.

---

## A complete service

```js
// server.js: Fastify v5 (ES modules)
import Fastify from 'fastify'
import { pathToFileURL } from 'node:url'

export function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },   // Pino: structured JSON logs
    requestIdHeader: 'x-request-id',                      // reuse the incoming ID for tracing
  })

  // ---- route with full schemas ----
  app.get('/products/:id', {
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string', minLength: 1 } },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: { locale: { type: 'string', default: 'en-GB' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const product = await getProduct(request.params.id, request.query.locale)
    if (!product) return reply.code(404).send({ message: 'Product not found' })
    return product                         // just return: Fastify serialises it with the response schema
  })

  return app
}

async function getProduct(id, locale) {
  // in a real app: call the commerce API (see "Calling upstream APIs")
  return { id, name: 'Trail Runner', price: 89.99, internalCostPrice: 31.2 }   // ← not in the schema
}

// start only when run directly (`node server.js`), not when imported by tests
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = buildApp()
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })   // v5: options object
}
```

**What the schemas give you:**

- **`params` / `querystring` / `body` are validated before the handler.** Invalid requests get an automatic **400**, and defaults are applied (`locale`).
- **The `response` schema makes serialisation faster**, and **removes fields that aren't declared**: `internalCostPrice` never leaks to clients. ✅ A security benefit too.

---

## Plugins & encapsulation

**Everything in Fastify is a plugin:** routes, database connections, auth. **Each plugin has its own scope.** Hooks and decorators added inside a plugin only apply **inside** it, unless you share them on purpose.

```js
import fp from 'fastify-plugin'

// a SHARED plugin: fp() breaks encapsulation so app.redis is available everywhere
export default fp(async function redisPlugin(app) {
  const redis = createRedisClient(process.env.REDIS_URL)
  app.decorate('redis', redis)                       // app.redis in all routes
  app.addHook('onClose', async () => redis.quit())   // cleaned up on shutdown
})
```

```js
// an ENCAPSULATED feature plugin: its auth hook only affects routes registered inside it
export default async function accountRoutes(app) {
  app.addHook('onRequest', async (request) => {
    await request.jwtVerify()                        // @fastify/jwt: protects only /account/* routes
  })

  app.get('/orders', async (request) => getOrders(request.user.id))
}

// app.js
app.register(redisPlugin)
app.register(accountRoutes, { prefix: '/account' })  // public routes elsewhere stay public
```

**Why it matters for scale:**

- **Features are isolated**, so one team's hook can't accidentally affect other routes.
- **Plugins load in order** and can depend on each other.
- **Easy to test in isolation.**

---

## Request lifecycle & hooks

```
onRequest → preParsing → preValidation → (schema validation) → preHandler → handler
         → preSerialization → onSend → onResponse                (onError if something throws)
```

| Hook | Typical use |
|---|---|
| `onRequest` | Auth checks, rate limiting, request IDs |
| `preHandler` | Load the user and permissions after validation |
| `onSend` | Add headers (cache control), compress |
| `onResponse` | Metrics: duration, status code |
| `onError` | Extra logging |
| `onClose` (app) | Close DB and Redis connections |

**Central error handling:**

```js
app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'request failed')
  if (error.validation) return reply.code(400).send({ message: 'Invalid request', details: error.validation })
  const status = error.statusCode ?? 500
  reply.code(status).send({ message: status < 500 ? error.message : 'Internal Server Error' })   // hide internals
})
```

---

## Calling upstream APIs

**For a BFF, upstream calls dominate response time.** Make them fast and safe:

```js
// aggregate a product page from several services, in parallel, with timeouts
app.get('/pages/product/:slug', { schema: { /* ... */ } }, async (request) => {
  const { slug } = request.params
  const signal = AbortSignal.timeout(1500)              // never wait forever

  const product = await commerce.getProduct(slug, { signal })
  if (!product) throw app.httpErrors.notFound()         // @fastify/sensible

  const [reviews, stock] = await Promise.allSettled([
    reviewsApi.summary(product.id, { signal: AbortSignal.timeout(500) }),
    inventory.stock(product.id, { signal }),
  ])

  return {
    product,
    reviews: reviews.status === 'fulfilled' ? reviews.value : null,       // degrade gracefully
    stock: stock.status === 'fulfilled' ? stock.value : { status: 'unknown' },
  }
})
```

| Technique | Why |
|---|---|
| **Parallel calls** (`Promise.all` / `allSettled`) | Total time = the slowest call, not the sum |
| **Timeouts** (`AbortSignal.timeout`) | A slow dependency can't hang your service |
| **Retries with backoff**, only for idempotent requests | Survive brief network failures |
| **Circuit breaker** (`opossum`) | Stop hammering a failing service; fail fast |
| **Keep-alive connection pooling** (`undici`, the engine behind Node's `fetch`) | Reuse TCP/TLS connections, lower latency |
| **Caching** (Redis / in-memory LRU, with TTL and stale-while-revalidate) | Fewer upstream calls, faster responses |
| **Request coalescing** | 100 simultaneous requests for the same product → 1 upstream call |

---

## Performance & scalability

- **Define schemas for every route**, both input and response (faster validation and serialisation, and safer).
- **Never block the event loop:** no sync `fs` or crypto in handlers; CPU-heavy work goes to worker threads or a queue.
- **Use `async`/`await` consistently.** Don't mix `reply.send()` with a returned value.
- **Logging:** Pino is fast, but log at sensible levels (no huge objects at `info`).
- **Scale horizontally:** stateless instances behind a load balancer (Kubernetes/ECS), or Node's cluster or PM2 on VMs. Shared state lives in Redis.
- **Caching layers:** CDN → Redis → in-process LRU.
- **Load test:** **autocannon** (from the Fastify ecosystem) or **k6**, and profile with `--inspect` / clinic.js.
- **Graceful shutdown:** `await app.close()` on SIGTERM. This runs the `onClose` hooks and finishes in-flight requests.

```js
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'shutting down')
    await app.close()            // stops accepting connections, runs onClose hooks
    process.exit(0)
  })
}
```

---

## Security & ecosystem

```js
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

await app.register(helmet)                                              // security headers
await app.register(cors, { origin: ['https://shop.example.com'], credentials: true })
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })     // per IP, can use Redis
```

| Plugin | Purpose |
|---|---|
| `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit` | Security basics |
| `@fastify/jwt`, `@fastify/cookie`, `@fastify/session` | Authentication |
| `@fastify/sensible` | HTTP error helpers (`httpErrors.notFound()`) |
| `@fastify/swagger` + `@fastify/swagger-ui` | **OpenAPI docs generated from your route schemas** |
| `@fastify/redis`, `@fastify/postgres` | Data stores |
| `@fastify/type-provider-typebox` | TypeScript types **inferred from schemas** |
| `@fastify/otel` / OpenTelemetry | Tracing |
| `@fastify/under-pressure` | Health checks plus load shedding when the event loop lags |

---

## Testing

**`app.inject()` sends fake HTTP requests without opening a port**, so tests are fast and need no network:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from './server.js'

test('GET /products/:id returns the product without internal fields', async () => {
  const app = buildApp()
  const res = await app.inject({ method: 'GET', url: '/products/p1' })

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { id: 'p1', name: 'Trail Runner', price: 89.99 })   // internalCostPrice stripped
  await app.close()
})
```

---

## What to learn

- ✅ **Fastify v5 basics:** routes, `async` handlers, `listen({ port, host })`, Node 20+.
- ✅ **JSON Schema** for params, query, body and response; Ajv; TypeBox type providers.
- ✅ **Plugins, encapsulation, `fastify-plugin`, decorators**, and the hooks lifecycle.
- ✅ **Error handling** (`setErrorHandler`), `@fastify/sensible`.
- ✅ **Upstream integration:** `undici`/`fetch` with timeouts, retries, circuit breakers, `Promise.allSettled`, caching with Redis, request coalescing.
- ✅ **Security plugins:** helmet, cors, rate-limit, jwt/cookies.
- ✅ **Testing** with `app.inject()` and `node:test`/Vitest; load testing with autocannon/k6.
- ✅ **Production:** Pino logging, OpenTelemetry, health checks, graceful shutdown, Docker, horizontal scaling.
- ✅ **Node fundamentals** (this site's **Node.js** tab: event loop, streams, cluster, memory leaks).

---

## Interview questions

**Q: Why Fastify over Express?**
Higher throughput, built-in JSON Schema validation and fast serialisation (which also strips undeclared fields), native async/await, an encapsulated plugin system, built-in Pino logging and strong TypeScript support.

**Q: What is plugin encapsulation?**
Each registered plugin has its own context: hooks, decorators and routes added inside don't leak to siblings or parents unless wrapped with `fastify-plugin`. That makes features isolated and safe.

**Q: How do response schemas improve performance and security?**
Fastify compiles a fast serialiser from the schema, and only declared fields are output, so internal fields never leak.

**Q: How would you make a BFF endpoint fast and resilient?**
Parallel upstream calls with timeouts, `allSettled` for optional data, keep-alive pooling, Redis caching with stale-while-revalidate, request coalescing, and circuit breakers.

**Q: How do you test Fastify routes?**
`app.inject()`, which simulates HTTP requests in-process without a network. It's fast and deterministic.

**Q: How do you scale a Fastify service?**
Keep instances stateless, scale horizontally behind a load balancer, put shared state and cache in Redis, protect it with rate limits and `under-pressure`, and handle SIGTERM with `app.close()`.

---

## 🎯 Interview answer

> "I'd use Fastify for Node services like a backend-for-frontend that aggregates commerce, CMS and inventory APIs. Fastify v5 runs on Node 20+, is significantly faster than Express, and its main strengths are JSON Schema validation and serialisation: I define schemas for params, query, body and responses, so invalid requests are rejected with a 400 before my handler runs, responses are serialised faster, and undeclared fields like internal cost prices are stripped. I organise the service as plugins: shared infrastructure like Redis or the HTTP client is registered with fastify-plugin and decorators, while feature plugins stay encapsulated, so, for example, an auth hook only protects the account routes. Error handling is centralised with setErrorHandler, logs are structured with Pino and carry request IDs, and I add helmet, CORS and rate limiting. For performance and scalability, upstream calls run in parallel with timeouts, `allSettled` for optional data, keep-alive pooling and circuit breakers, results are cached in Redis, instances are stateless and scale horizontally, and SIGTERM triggers `app.close()` for a graceful shutdown. I test routes with `app.inject()` and load-test with autocannon or k6 before peak events."
