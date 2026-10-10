## Quick answer

**Handle it on both sides: the frontend reduces duplicates, the backend guarantees them away.**

- **Frontend (React):** disable the button while pending, add a ref guard, send an **`Idempotency-Key`** header, and redirect after success.
- **Backend (Node.js):** an **idempotency layer** (Redis `SET NX`) that runs a request once and replays the stored response for duplicates. Behind it, **database unique constraints**, conditional updates and transactions.

**The goal is idempotency:** the same action gives the same result **once**, however many times the request arrives.

---

## Why duplicates happen

| Cause | Can the frontend stop it? |
|---|---|
| Double-click / impatient second click | ✅ mostly (disable + ref guard) |
| A timeout: the server processed the request, but the response was lost, so the client (axios retry, a proxy, a mobile network) retries | ❌ only the backend can tell |
| Refresh after POST, Back + resubmit | ✅ mostly (Post/Redirect/Get) |
| Two tabs, or two devices | ❌ |
| A queue delivers the same message twice ("at-least-once") | ❌ backend only |
| A bot or a malicious replay | ❌ backend only |

**That's why the backend must be the real protection.** Frontend measures are UX.

---

## Frontend (React)

**1. A pending state disables the button and shows progress:**

```jsx
const mutation = useMutation({ mutationFn: placeOrder })   // TanStack Query: mutations don't auto-retry by default

<button type="submit" disabled={mutation.isPending}>
  {mutation.isPending ? 'Placing order…' : 'Place order'}
</button>
```

In React 19, `useActionState` gives `isPending`, and `useFormStatus().pending` works inside a `<form action={...}>`.

**2. A ref guard.** State updates aren't instant, but a ref is, so two very fast clicks can't both get through:

```jsx
const inFlight = useRef(false)

async function handleSubmit(values) {
  if (inFlight.current) return
  inFlight.current = true
  try {
    await mutation.mutateAsync(values)
  } finally {
    inFlight.current = false
  }
}
```

**3. An idempotency key: one UUID per submission attempt, reused on retries:**

```jsx
const idemKey = useRef(crypto.randomUUID())

const placeOrder = (body) =>
  api.post('/orders', body, { headers: { 'Idempotency-Key': idemKey.current } })

// new key only after success, or when the user changes the form:
// idemKey.current = crypto.randomUUID()
```

**4. Post/Redirect/Get:** after success, `navigate('/orders/123', { replace: true })`, so refreshing or pressing Back doesn't resubmit.

**5. No optimistic UI for orders or payments.** Show a clear pending state. (Optimistic UI is fine for likes and toggles.)

**Debounce is not a solution.** It only delays the problem and makes the UI feel slow.

---

## Backend: idempotency keys

**The pattern popularised by Stripe:**

```
Client ──POST /orders  Idempotency-Key: 7f3a…──▶ API
                                                 │ SET idem:user42:7f3a "processing" NX EX 60
                                                 │   ├─ OK (first time)      → process → store {code, body} for 24h
                                                 │   └─ exists:
                                                 │        ├─ different body hash        → 422
                                                 │        ├─ status "processing"        → 409 (still running; retry later)
                                                 │        └─ status "done"              → replay the stored response
```

```js
import { createHash } from 'node:crypto'
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

async function idempotency(req, res, next) {
  const key = req.get('Idempotency-Key')
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header is required' })

  const redisKey = `idem:${req.user.id}:${key}`              // scope per user: keys can't collide across users
  const hash = sha256(JSON.stringify(req.body))

  // atomic: only the FIRST request with this key gets 'OK'
  const created = await redis.set(redisKey, JSON.stringify({ status: 'processing', hash }), { NX: true, EX: 60 })

  if (!created) {
    const saved = JSON.parse(await redis.get(redisKey))
    if (saved.hash !== hash) return res.status(422).json({ error: 'Idempotency-Key reused with a different request' })
    if (saved.status === 'processing') return res.status(409).json({ error: 'Request already in progress' })
    res.set('Idempotent-Replayed', 'true')
    return res.status(saved.code).json(saved.body)            // duplicate → same response as the first time
  }

  const json = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode >= 500) redis.del(redisKey)             // server failure: allow a genuine retry
    else redis.set(redisKey, JSON.stringify({ status: 'done', hash, code: res.statusCode, body }), { EX: 86_400 })
    return json(body)
  }
  next()
}

app.post('/orders', auth, idempotency, createOrder)
```

**Design decisions to mention:**
- **`processing` expires after 60 seconds**, so a crashed request doesn't block that key forever. **Completed responses are kept for 24 hours.**
- **Store 4xx results too** (a validation error stays the same error). **Don't store 5xx results**, so a genuine retry can succeed.
- **Key scope:** per user (and per endpoint if you like).
- **Where to store the keys:** **Redis** (fast, with TTLs) or a **database table** (`idempotency_keys` with a unique key). With a table, you can write the key **in the same transaction** as the order, which makes it fully atomic.
- **The IETF is standardising the `Idempotency-Key` header** (an HTTP API working group draft), so it's a recognised pattern, not a custom invention.

---

## Backend: database guarantees

**Redis can fail or be flushed. The database is the final guarantee.**

**1. Unique constraints on a natural key:**

```sql
-- one order per checkout session / cart
ALTER TABLE orders ADD CONSTRAINT uniq_order_per_cart UNIQUE (user_id, cart_id);

-- or store the client key itself
ALTER TABLE orders ADD COLUMN idempotency_key uuid UNIQUE;
```

```js
try {
  const order = await db.insert(orders).values({ userId, cartId, total, idempotencyKey: key }).returning()
  return res.status(201).json(order)
} catch (err) {
  if (err.code === '23505') {                                  // Postgres unique_violation
    return res.status(200).json(await findOrderByCart(userId, cartId))
  }
  throw err
}
```

**2. Conditional updates: "only if still in the expected state":**

```sql
UPDATE carts SET status = 'ordered' WHERE id = $1 AND status = 'open';
-- 0 rows updated → someone already placed this order → stop
```

**3. Transactions and row locks** for check-then-act logic:

```sql
BEGIN;
SELECT stock FROM products WHERE id = $1 FOR UPDATE;    -- other transactions wait here
UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0;
INSERT INTO orders (...) VALUES (...);
COMMIT;
```

**4. Optimistic concurrency** for edits: a `version` column, or `ETag` / `If-Match` headers. `UPDATE … WHERE id = $1 AND version = $2` (0 rows means someone else changed it, so return `409` or `412`).

**MongoDB equivalents:** unique indexes (duplicate key error code `11000`), `findOneAndUpdate` with a status filter, and transactions.

---

## Beyond one service

| Area | Approach |
|---|---|
| **Payments** | Pass your idempotency key to the payment provider (Stripe's `idempotencyKey` option, and similar in Adyen and PayPal), so a retry never charges twice |
| **Queues** (SQS, Kafka, RabbitMQ) | Delivery is **at least once**, so consumers store processed **event IDs** (a unique table or Redis) and skip repeats. The "outbox pattern" writes events in the same DB transaction. |
| **Webhooks you receive** | Providers retry, so deduplicate on the event ID |
| **Microservices / gateway** | Forward the same `Idempotency-Key` downstream; retries at the gateway must only apply to idempotent requests |
| **Rate limiting** | Per user and endpoint (e.g. `@fastify/rate-limit`, `express-rate-limit`), for abuse, not as the main fix |

**HTTP methods:**
- `GET`, `PUT` and `DELETE` are **idempotent by definition**: repeating them gives the same state.
- `POST` and `PATCH` are not, which is why they need keys.
- Designing **`PUT /orders/{clientGeneratedId}`** is another way to make creation idempotent.

---

## Testing it

```js
// fire the same request twice in parallel: exactly one order must exist
const body = { cartId: 'c1' }
const headers = { 'Idempotency-Key': 'test-key-1', Authorization: token }
const [a, b] = await Promise.all([post('/orders', body, headers), post('/orders', body, headers)])

expect([a.status, b.status].sort()).toEqual([201, 409])        // or 201 + replayed 201
expect(await countOrders('c1')).toBe(1)
```

**Also test:**
- A sequential duplicate (the second request gets a replayed response).
- The same key with a different body (`422`).
- A server error followed by a retry (it succeeds).
- In Playwright, a double-click on the submit button creates only one order.

---

## Interview Q&A

**Q: Isn't disabling the button enough?**
No. It stops double-clicks, but not network retries after timeouts, multiple tabs, replays or queue redeliveries. The server must be idempotent.

**Q: Who generates the idempotency key?**
The client, once per submission attempt (a UUID), and it reuses the key for every retry of that attempt. A new key means a new, intentional action.

**Q: What if two identical requests arrive at the same time?**
An atomic `SET NX` (or a unique insert) lets exactly one win. The other gets `409` and retries later, or waits and gets the replayed response.

**Q: Why also a unique constraint if you have Redis?**
Defence in depth: Redis can be flushed, expire keys or be bypassed by another code path. The database constraint is the guarantee that can't be skipped.

**Q: What about `GET` requests?**
They're idempotent by definition and safe to retry. Duplicate protection is for state-changing `POST`/`PATCH`.

---

## 🎯 Interview answer

> "I handle duplicate submissions on both sides, because the frontend can only reduce them while the backend has to guarantee them away. In React, the submit button is disabled with a pending state from `useMutation` or `useActionState`, a ref guards against very fast double clicks, and after success I redirect with `replace` so a refresh or Back doesn't resubmit. Each submission attempt gets a UUID idempotency key sent as a header and reused on retries. In Node, middleware stores that key per user in Redis with an atomic `SET NX`: the first request processes, a concurrent duplicate gets 409, a later duplicate gets the stored response replayed, and the same key with a different body gets 422. Server errors clear the key so genuine retries work; processing locks expire quickly and results are kept for 24 hours. Underneath, the database enforces it with unique constraints, like one order per cart, plus conditional updates, transactions and row locks. I pass the key on to the payment provider, make queue and webhook consumers deduplicate on event IDs, and add rate limiting. I test it by firing parallel identical requests and asserting that exactly one order exists."
