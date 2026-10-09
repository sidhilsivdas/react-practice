## 📄 Original answer (PDF)

**Question:** What are the architectural trade-offs of using GraphQL versus REST in a React ecosystem?

**Answer:** GraphQL prevents over/under-fetching and provides a typed schema out of the box, excellent for complex UIs. The trade-off is cache complexity; standard HTTP caching is harder, requiring heavy client libraries (Apollo/Relay). REST is simpler, natively cached, but often requires multiple round-trips.

**Real-time example:** A mobile-first React app choosing GraphQL to strictly limit payload size over 3G networks, asking for exactly 4 fields for a user profile instead of the REST API's 50-field default payload.

---

## 💡 Side by side

| | **REST** | **GraphQL** |
|---|---|---|
| Shape | Many endpoints (`/users/1`, `/users/1/orders`) | **One endpoint**; the client asks for exactly what it needs |
| Over / under-fetching | Common (50 fields when you need 4; 3 calls for one screen) | Solved: one query, exact fields |
| Types / contract | Optional (OpenAPI) | **Built-in schema**; codegen gives TypeScript types |
| HTTP caching (CDN, browser) | ✅ natural (`GET` + `Cache-Control`) | ⚠️ harder (mostly `POST`); needs persisted queries + GET, or client-side caching |
| Client caching | Simple (TanStack Query / RTK Query by URL) | Normalised caches (Apollo, Relay, urql): powerful, but more to learn |
| Errors | HTTP status codes | Usually `200` with an `errors` array, so status-based monitoring needs adapting |
| File uploads, streaming | Easy | Needs extensions (multipart spec) |
| Real-time | WebSockets / SSE separately | **Subscriptions** built in |
| Server complexity | Simple | Resolvers, the **N+1 problem** (use DataLoader), query cost limits |
| Security | Per-endpoint rules | **Depth and complexity limits, persisted queries**, per-field auth |
| Versioning | `/v1`, `/v2` | Evolve the schema; deprecate fields |
| Tooling | Universal | GraphiQL, codegen, Apollo DevTools |

---

## 💡 In React code

```tsx
// REST + TanStack Query: two requests for one screen
const { data: user } = useQuery({ queryKey: ['user', id], queryFn: () => api.get(`/users/${id}`) })
const { data: orders } = useQuery({ queryKey: ['orders', id], queryFn: () => api.get(`/users/${id}/orders?limit=3`) })
```

```tsx
// GraphQL + Apollo: one request, exact fields, typed by codegen
const PROFILE = gql`
  query Profile($id: ID!) {
    user(id: $id) {
      name
      avatarUrl
      orders(last: 3) { id total status }
    }
  }
`
const { data, loading, error } = useQuery(PROFILE, { variables: { id } })
```

**Fragment colocation (Relay / Apollo):** each component declares the fields it needs as a fragment, and the page query composes them. Components never break because someone removed a field elsewhere.

---

## 💡 Middle grounds

- **BFF (backend-for-frontend):** REST or RPC endpoints **shaped per screen** (`GET /api/pages/profile/1`). You get most of GraphQL's "one round-trip, exact data" benefit with simple HTTP caching.
- **Next.js server components:** fetch from many REST services on the server and send the client only rendered HTML. Over-fetching then happens server-to-server (fast), not over 3G.
- **tRPC:** end-to-end type safety for TypeScript monorepos, without a schema language.
- **GraphQL federation:** many backend teams contribute to one graph (Apollo Federation / GraphQL Mesh).
- **Persisted queries:** the client sends a query **hash** via GET, so you regain CDN caching and block arbitrary queries.

---

## 💡 How to decide

| Choose GraphQL when | Choose REST (or a BFF) when |
|---|---|
| Many clients (web, iOS, Android) need different shapes of the same data | One main client, simple CRUD |
| Complex, nested, relationship-heavy UIs | Public APIs, file handling, heavy HTTP/CDN caching needs |
| Many backend services to unify (federation) | Small team, little appetite for GraphQL server complexity |
| You want a strongly typed contract and codegen | Webhooks and integrations with third parties (REST is the common language) |

**For e-commerce:** many headless platforms offer both. Shopify's Storefront API and commercetools are GraphQL-first; others are REST-first.

---

## 🎯 Interview answer

> "GraphQL lets the client request exactly the fields it needs in one round trip, with a typed schema that generates TypeScript types, which is great for complex UIs and multiple clients like web and mobile; components can colocate their data needs as fragments, and subscriptions cover real-time. The costs are caching, since queries are usually POSTs that bypass HTTP and CDN caching unless you use persisted queries over GET, a heavier normalised client like Apollo or Relay, error handling that doesn't map to status codes, and server work like solving N+1 with DataLoader and limiting query depth and cost. REST is simpler, cache-friendly and universal, but tends to over-fetch or need several calls per screen. In practice, a BFF that exposes screen-shaped REST endpoints, or Next.js server components fetching on the server, often gives most of GraphQL's benefits with simpler caching. I'd choose GraphQL when there are many clients, complex relational data or many backend domains to federate, and REST or a BFF for simpler products, public APIs and heavily cached content."
