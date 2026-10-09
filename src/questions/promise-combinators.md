## Short answer

| Method | Waits for | Resolves with | Rejects when | Use it for |
|---|---|---|---|---|
| **`Promise.all`** | **all** to succeed | array of results (same order) | **any one fails** (immediately) | Page needs **every** piece of data |
| **`Promise.allSettled`** | **all** to finish (success or fail) | `[{ status, value / reason }]` | **never** | Load what you can, show the rest as errors |
| **`Promise.race`** | the **first to finish** (success **or** failure) | the first result | the first one **fails** | **Timeouts** |
| **`Promise.any`** | the **first to succeed** | the first success | **all** fail (`AggregateError`) | **Fastest server / fallback** |

**Analogy: ordering food from 3 restaurants** 🍕

- **all:** you eat only when **all 3** orders arrive. If one restaurant cancels, dinner is off.
- **allSettled:** you wait for all 3 to **answer**, then eat whatever arrived.
- **race:** you react to **whatever happens first**, even if it's a cancellation.
- **any:** you eat the **first order that actually arrives**, ignoring cancellations. Only if all 3 cancel do you go hungry.

**All outputs and timings below come from actually running the code.** The fake API used everywhere:

```js
// resolves (or rejects) after `ms`, like a real network call
const fakeApi = (name, ms, shouldFail = false) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (shouldFail ? reject(new Error(`${name} failed`)) : resolve(`${name} data`)), ms)
  )
```

---

## Promise.all

**Everything must succeed:**

```js
async function loadDashboard() {
  try {
    const [user, orders, cart] = await Promise.all([
      fakeApi('user', 300),
      fakeApi('orders', 500),
      fakeApi('cart', 100),
    ])
    console.log(user, orders, cart)
  } catch (error) {
    console.error('Dashboard failed:', error.message)
  }
}
```

```
✅ all succeed:  ['user data', 'orders data', 'cart data']   in ~500ms (the slowest, NOT 300+500+100)
❌ orders fails:  "orders failed"                             in ~200ms (rejects as soon as one fails)
```

- **The results stay in input order**, even if `cart` finished first.
- **It's fail-fast:** one failure rejects everything, and you lose the successful results.
- **⚠️ The other requests keep running** in the background. Promises can't be cancelled. To actually cancel them, use `AbortController`.

**Use it when the page is useless without all the data.**

---

## Promise.allSettled

**Wait for all of them, and never fail:**

```js
async function loadProductPage() {
  const results = await Promise.allSettled([
    fakeApi('product', 300),
    fakeApi('reviews', 200, true),     // reviews service is down
    fakeApi('recommendations', 100),
  ])

  const [product, reviews, recommendations] = results.map((r) =>
    r.status === 'fulfilled' ? r.value : null      // failed parts become null
  )

  if (!product) throw new Error('Product is required')   // decide what's essential
  return { product, reviews, recommendations }          // reviews = null → show "Reviews unavailable"
}
```

```
[
  { status: 'fulfilled', value: 'user data' },
  { status: 'rejected',  reason: Error('orders failed') },
  { status: 'fulfilled', value: 'cart data' }
]   in ~300ms
```

**Use it for independent sections**, where one broken service shouldn't break the whole page. ⭐ It's the most useful one in real apps.

---

## Promise.race

**The first to finish wins, even if it's a failure:**

```js
const winner = await Promise.race([
  fakeApi('server-A', 300),
  fakeApi('server-B', 100),
  fakeApi('server-C', 200),
])
// 'server-B data' in ~100ms
```

**⚠️ If the fastest one fails, `race` rejects:**

```js
await Promise.race([fakeApi('server-A', 300), fakeApi('server-B', 100, true)])
// ❌ "server-B failed" in ~100ms (even though server-A would have succeeded)
```

### The main real use: timeouts ⭐

```js
const timeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms))

async function fetchWithTimeout(promise, ms) {
  return Promise.race([promise, timeout(ms)])
}

await fetchWithTimeout(fakeApi('slow-report', 3000), 1000)
// ❌ "Timed out after 1000ms"
```

**Modern `fetch` alternative, which also cancels the request:**

```js
const res = await fetch('/api/report', { signal: AbortSignal.timeout(1000) })
```

---

## Promise.any

**The first success wins:**

```js
const data = await Promise.any([
  fakeApi('mirror-1', 100, true),   // fails first, ignored
  fakeApi('mirror-2', 300),
  fakeApi('mirror-3', 200),
])
// 'mirror-3 data' in ~200ms (the first SUCCESS)
```

**Only when all of them fail does it reject, with an `AggregateError`:**

```js
try {
  await Promise.any([fakeApi('m1', 100, true), fakeApi('m2', 200, true)])
} catch (e) {
  e.constructor.name   // 'AggregateError'
  e.message            // 'All promises were rejected'
  e.errors             // [Error('m1 failed'), Error('m2 failed')]: all the reasons
}
```

**Use it for redundant sources:** CDN mirrors, multiple regions, or primary and backup APIs.

### race vs any

```
Promises:    A ✅ 300ms    B ❌ 100ms    C ✅ 200ms

race  → ❌ rejects at 100ms with B's error   (first to SETTLE)
any   → ✅ resolves at 200ms with C's value  (first to SUCCEED)
```

---

## Sequential vs parallel

```js
// ❌ Sequential: each waits for the previous one
for (const id of ['a', 'b', 'c']) {
  await fakeApi(id, 200)
}
// ~600ms

// ✅ Parallel: all start at once
await Promise.all([fakeApi('a', 200), fakeApi('b', 200), fakeApi('c', 200)])
// ~200ms
```

**Use sequential only when a call needs the previous result:**

```js
const user = await getUser(id)
const orders = await getOrders(user.accountId)   // needs user first
```

---

## Concurrency limit

**Don't send 500 requests at once:**

```js
async function runWithLimit(tasks, limit) {
  const results = new Array(tasks.length)
  let next = 0

  async function worker() {
    while (next < tasks.length) {
      const i = next++                        // claim the next task
      results[i] = await tasks[i]()           // keep results in input order
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

const tasks = productIds.map((id) => () => fetchProduct(id))   // functions, so they don't start yet
const products = await runWithLimit(tasks, 2)
// 6 tasks of 100ms, limit 2 → ~300ms, never more than 2 running at once
```

**Why:**

- **Servers rate-limit you.**
- **Browsers only allow about 6 connections per host on HTTP/1.1.**
- **Thousands of parallel requests can crash a Node service.**

(The `p-limit` library does the same.)

---

## Retry with backoff

```js
async function retry(fn, { retries = 3, delay = 100 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt >= retries) throw err                              // give up
      await new Promise((r) => setTimeout(r, delay * 2 ** attempt))  // wait 100, 200, 400ms...
    }
  }
}

const data = await retry(() => fetchJson('/api/flaky'))
// a call that fails twice, then works → succeeds on the 3rd attempt
```

**Only retry safe requests** (GET, or requests with an idempotency key), never a payment without one.

---

## Real fetch version

```js
async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)   // ⚠️ fetch does NOT reject on 404/500
  return res.json()
}

async function loadPage(productId) {
  const controller = new AbortController()
  const { signal } = controller

  try {
    // required data: all-or-nothing, cancel the others if one fails
    const [product, price] = await Promise.all([
      fetchJson(`/api/products/${productId}`, { signal }),
      fetchJson(`/api/prices/${productId}`, { signal }),
    ])

    // optional data: whatever succeeds, with a timeout
    const [reviews, related] = await Promise.allSettled([
      fetchJson(`/api/reviews/${productId}`, { signal: AbortSignal.timeout(800) }),
      fetchJson(`/api/related/${productId}`, { signal: AbortSignal.timeout(800) }),
    ])

    return {
      product,
      price,
      reviews: reviews.status === 'fulfilled' ? reviews.value : null,
      related: related.status === 'fulfilled' ? related.value : [],
    }
  } catch (error) {
    controller.abort()       // stop the remaining required requests
    throw error
  }
}
```

---

## In React

```jsx
function ProductPage({ productId }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    Promise.allSettled([
      fetchJson(`/api/products/${productId}`, { signal: controller.signal }),
      fetchJson(`/api/reviews/${productId}`, { signal: controller.signal }),
    ]).then(([product, reviews]) => {
      if (controller.signal.aborted) return                 // the user navigated away
      if (product.status === 'rejected') return setState({ status: 'error' })
      setState({
        status: 'success',
        product: product.value,
        reviews: reviews.status === 'fulfilled' ? reviews.value : null,
      })
    })

    return () => controller.abort()                         // cancel on unmount or productId change
  }, [productId])

  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error') return <p>Couldn't load this product.</p>
  return (
    <>
      <ProductDetails product={state.product} />
      {state.reviews ? <Reviews items={state.reviews} /> : <p>Reviews unavailable.</p>}
    </>
  )
}
```

(In real apps, TanStack Query or RTK Query handle the caching, retries and cancellation for you.)

---

## Gotchas

| Gotcha | Result (tested) |
|---|---|
| `Promise.all([])` | resolves **immediately** with `[]` |
| `Promise.any([])` | rejects immediately with **`AggregateError`** |
| `Promise.race([])` | **never settles** (pending forever) |
| `fetch` on 404 or 500 | **doesn't reject.** Check `res.ok` yourself. |
| `Promise.all` fails | the other requests **keep running**. Abort them with `AbortController`. |
| `array.forEach(async ...)` | **doesn't wait**: results were `[]` right after the loop. Use `for...of` with `await`, or `Promise.all(array.map(...))`. |
| Starting promises too early | `const p = fetch(...)` starts **immediately**. For a concurrency limit, pass **functions** (`() => fetch(...)`). |

### Which one to choose?

```
Need ALL results, and any failure means the whole thing failed?   → Promise.all
Independent parts, show what works?                               → Promise.allSettled
Need a timeout, or the first response whatever it is?             → Promise.race (or AbortSignal.timeout)
Several sources for the same data, want the first good one?       → Promise.any
Each call needs the previous result?                              → sequential await
Hundreds of calls?                                                → concurrency limit (p-limit / pool)
Unreliable network?                                               → retry with backoff (safe requests only)
```

---

## 🎯 Interview answer

> "To call several APIs at once, I start all the promises and combine them, so the total time is the slowest call rather than the sum. `Promise.all` resolves with all results in input order but rejects as soon as any one fails, so I use it when every piece is required, and I abort the remaining requests with an AbortController because promises themselves don't cancel. `Promise.allSettled` waits for everything and never rejects, returning a status for each, which is ideal for independent page sections where a failing reviews service shouldn't break the page. `Promise.race` settles with whichever finishes first, success or failure, so its classic use is a timeout, though for fetch I'd use `AbortSignal.timeout`, which also cancels the request. `Promise.any` resolves with the first success, ignores failures, and only rejects with an AggregateError if all fail, which suits redundant mirrors or fallbacks. I use sequential awaits only when calls depend on each other, a concurrency limit for large batches, and retries with exponential backoff for idempotent requests, and I always check `res.ok`, since fetch doesn't reject on HTTP errors."
