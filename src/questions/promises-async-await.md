## Short answer

**A Promise is an object representing a value that will be available later**, like the result of an API call.

**It's always in one of 3 states:**

| State | Meaning | How it gets there |
|---|---|---|
| **pending** ⏳ | still waiting | the starting state |
| **fulfilled** ✅ | finished successfully, has a **value** | `resolve(value)` |
| **rejected** ❌ | failed, has a **reason** (an error) | `reject(error)`, or an error is thrown |

**fulfilled or rejected = "settled".** A promise **settles only once**, and then never changes.

**Two ways to use the result:**

- **`.then()` / `.catch()` / `.finally()`:** chaining.
- **`async` / `await`:** the same thing, but it **reads like normal step-by-step code**.

**Analogy: a restaurant buzzer** 📟 You order (start the async work) and get a buzzer (the promise). You can do other things. The buzzer either **lights up green** (fulfilled: your food) or **red** (rejected: "sorry, sold out"), and it only ever does that once.

**All outputs below come from actually running the code in Node.js.**

---

## Creating a promise

```js
const getUser = (id) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) resolve({ id, name: 'Sam' })      // → fulfilled
      else reject(new Error('Invalid id'))           // → rejected
    }, 500)
  })
```

**The states, as Node prints them:**

```
Promise { <pending> }     ← new Promise(() => {}) never settles
Promise { 42 }            ← Promise.resolve(42)
Promise { <rejected> Error: nope ... }
```

### A promise settles only once

```js
const p = new Promise((resolve, reject) => {
  resolve('first')
  resolve('second')              // ignored
  reject(new Error('ignored'))   // ignored
})
await p   // 'first'
```

### The executor runs immediately (synchronously)

```js
new Promise((resolve) => {
  console.log('executor runs now')     // 1
  resolve()
}).then(() => console.log('then later'))   // 3
console.log('after constructor')       // 2
```

**Only the `.then` callbacks are async** (they run as microtasks).

### Shortcuts

```js
Promise.resolve(42)              // already fulfilled
Promise.reject(new Error('x'))   // already rejected
```

---

## then / catch / finally

```js
getUser(1)
  .then((user) => {
    console.log('Got', user.name)
    return getOrders(user.id)        // return a promise → the next .then waits for it
  })
  .then((orders) => console.log('Orders:', orders.length))
  .catch((error) => console.error('Something failed:', error.message))   // catches ANY error above
  .finally(() => hideSpinner())       // runs either way
```

### How chaining works ⭐

**Every `.then()` returns a NEW promise.** What you return decides what happens next:

| Inside `.then(fn)`, `fn`... | The next promise is |
|---|---|
| returns a value | **fulfilled** with that value |
| returns a promise | **waits** for it, then takes its result |
| **throws** an error | **rejected** with that error, skipping to the next `.catch` |
| returns nothing | fulfilled with **`undefined`** (a common bug!) |

```js
const result = await Promise.resolve(2)
  .then((x) => x * 10)                                       // 20
  .then((x) => { if (x > 10) throw new Error('too big: ' + x); return x })
  .then(() => 'skipped')                                     // ⏭ skipped: we're in the rejected path
  .catch((err) => 'recovered from ' + err.message)           // handles it, returns a value
  .then((x) => x + ' → continues')                           // back to the success path

// 'recovered from too big: 20 → continues'
```

### `.catch` recovers, `.finally` passes through

- **`.catch()` that returns a value** → the chain continues as **fulfilled**.
- **`.catch()` that throws again** → stays **rejected**.
- **`.finally()` doesn't receive or change the value:**

```js
await Promise.resolve('data').finally(() => 'ignored return')   // 'data'
```

### ❌ The forgotten `return`

```js
await Promise.resolve(1).then((x) => { x * 2 })   // undefined (no return inside { })
await Promise.resolve(1).then((x) => x * 2)       // 2
```

---

## async / await

**`async`/`await` is built on promises.** It makes async code read top to bottom:

```js
async function loadUserOrders(id) {
  try {
    const user = await getUser(id)           // pause here until fulfilled (or throw if rejected)
    const orders = await getOrders(user.id)
    return { user, orders }                  // becomes the fulfilled value
  } catch (error) {
    console.error('Failed:', error.message)  // rejected promises become thrown errors
    throw error                              // re-throw if the caller should know
  } finally {
    hideSpinner()
  }
}
```

### Rules

| Rule | Example (tested) |
|---|---|
| An `async` function **always returns a promise** | `async function f() { return 5 }` → `f()` gives `Promise { 5 }` |
| `throw` inside `async` → a **rejected** promise | `fails().catch(e => e.message)` gives `'boom'` |
| `await` **pauses only this function**, not the whole program | other code and events keep running |
| `await` on a non-promise just returns the value | `await 7` gives `7` |
| `await` needs an `async` function, or **top-level** in ES modules | `<script type="module">`, `.mjs` |
| A rejected promise makes `await` **throw** | so use `try/catch` |

### try / catch / finally flow

```
load(true)  → try, success, finally
load(false) → try, catch: failed, finally
```

### then/catch vs async/await

```js
// Promise chain
function loadA(id) {
  return getUser(id)
    .then((user) => getOrders(user.id))
    .catch((e) => { console.error(e); return [] })
}

// async/await: same behaviour
async function loadB(id) {
  try {
    const user = await getUser(id)
    return await getOrders(user.id)
  } catch (e) {
    console.error(e)
    return []
  }
}
```

**Prefer async/await for readability.** `.then` is still handy for short one-liners and for `Promise.all(...).then(...)`.

---

## Execution order

```js
console.log('1 sync')
setTimeout(() => console.log('5 timeout'), 0)
Promise.resolve().then(() => console.log('3 then'))

;(async () => {
  console.log('2 async start')       // runs synchronously until the first await
  await null
  console.log('4 after await')       // the rest runs as a microtask
})()
```

```
1 sync → 2 async start → 3 then → 4 after await → 5 timeout
```

**Synchronous code first, then microtasks (promise callbacks and code after `await`), then macrotasks (timers).** (See the **event loop** question.)

---

## Sequential vs parallel

```js
// ❌ sequential when calls don't depend on each other: slow (sum of all times)
const user = await getUser(1)
const products = await getProducts()

// ✅ parallel: start both, then wait (time of the slowest)
const [user2, products2] = await Promise.all([getUser(1), getProducts()])
```

**`array.forEach(async ...)` does NOT wait:**

```js
items.forEach(async (item) => await save(item))   // ❌ returns immediately, errors are unhandled
for (const item of items) await save(item)         // ✅ one by one
await Promise.all(items.map((item) => save(item))) // ✅ in parallel
```

(See **Calling multiple APIs: Promise.all, allSettled, race & any** for all the combinators.)

---

## Handling HTTP status codes ⭐

**`fetch` only rejects on network failures** (offline, DNS, CORS, abort). **A 404 or 500 is still a fulfilled promise** with `res.ok === false`. You must check it yourself:

```js
const res = new Response('missing', { status: 404 })
res.ok       // false
res.status   // 404   ← fetch would NOT have thrown
```

### A reusable request helper

```js
class HttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.body = body                 // server's error details (validation messages...)
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), ...options })   // network errors reject here
  const isJson = res.headers.get('content-type')?.includes('json')
  const body = isJson ? await res.json() : await res.text()

  if (!res.ok) throw new HttpError(res.status, body)   // turn 4xx/5xx into a rejection
  return body
}
```

### Handling each status

```js
async function saveProfile(data) {
  try {
    const profile = await request('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    showToast('Saved!')
    return profile
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return showToast('Request timed out. Please try again.')
    }
    if (!(error instanceof HttpError)) {
      return showToast('You seem to be offline.')            // network error (TypeError: fetch failed)
    }

    switch (error.status) {
      case 400:
      case 422: return showFieldErrors(error.body.errors)    // validation → show next to the inputs
      case 401: return redirectToLogin()                      // not logged in / token expired
      case 403: return showToast("You don't have permission.")
      case 404: return showNotFound()
      case 409: return showToast('Someone else changed this. Reload and try again.')
      case 429: return retryLater(error)                      // rate limited
      default:
        if (error.status >= 500) return showToast('Server problem. Please try again shortly.')
        throw error                                           // unexpected: let the error boundary or logger handle it
    }
  }
}
```

**Results from running the same logic against real `Response` objects:**

```
200 → ok: {"id":1}
404 → not found
422 → validation: {"email":"invalid"}
401 → not logged in → redirect to login
429 → too many requests → retry later
503 → server error → retry / try again later
offline → network error: fetch failed
timeout → TimeoutError → request cancelled / timed out
```

| Status | Meaning | Typical UI |
|---|---|---|
| **200 / 201 / 204** | OK / created / no content | show the result |
| **400 / 422** | bad input / validation failed | messages next to the form fields |
| **401** | not authenticated | refresh the token, or redirect to login |
| **403** | authenticated, but not allowed | "no permission" message |
| **404** | not found | not-found page or message |
| **409** | conflict (already exists, edited by someone else) | reload / merge prompt |
| **429** | too many requests | wait (respect the `Retry-After` header) and retry |
| **500 / 502 / 503 / 504** | server or gateway problem | "try again" + retry with backoff for safe requests |

**In real apps:** axios, TanStack Query and RTK Query give you `error.status` / `error.response.status`, retries and global handlers (like an axios interceptor for 401).

---

## Unhandled rejections

**A rejected promise with no `.catch` (or `try/catch`) is an "unhandled rejection":**

```js
Promise.reject(new Error('nobody caught me'))
// Node: 'unhandledRejection' event; since Node 15 it CRASHES the process by default
// Browser: "Uncaught (in promise) Error" in the console + 'unhandledrejection' event
```

```js
window.addEventListener('unhandledrejection', (event) => {
  errorTracker.capture(event.reason)       // log anything you forgot to handle
})
```

**Rules:**

- **Always `return` or `await` promises**, so errors propagate to a handler.
- **End every chain with `.catch`**, or wrap awaits in `try/catch`.
- **Catch where you can actually do something useful** (show a message, retry). Don't swallow errors silently with an empty `catch {}`.

---

## Before promises: callback hell

```js
getUser(1, (err, user) => {
  if (err) return handle(err)
  getOrders(user.id, (err, orders) => {
    if (err) return handle(err)
    getDetails(orders[0].id, (err, details) => {     // the "pyramid of doom"
      if (err) return handle(err)
      render(details)
    })
  })
})
```

**Promises flattened this into chains, and async/await made it read like synchronous code**, with one `try/catch` for all errors.

```js
const { promisify } = require('node:util')
const readFileAsync = promisify(fs.readFile)    // convert callback APIs to promises
```

---

## Quick Q&A

**Q: What is a Promise? What are its states?**
An object representing a future result: pending, then either fulfilled (with a value) or rejected (with a reason). It settles only once.

**Q: What does `.then` return?**
A new promise, resolved with whatever the callback returns: a value, the result of a returned promise, or a rejection if it throws.

**Q: `.catch` vs `try/catch`?**
`.catch` handles rejections in a promise chain; `try/catch` handles rejected awaits inside async functions. They're equivalent ways of handling the same errors.

**Q: Does `fetch` reject on a 404?**
No. Only network errors reject. Check `res.ok` / `res.status` and throw yourself.

**Q: What does an `async` function return?**
Always a promise: fulfilled with the returned value, or rejected with the thrown error.

**Q: Is the Promise executor sync or async?**
Synchronous. Only the `.then`/`.catch`/`.finally` callbacks run later, as microtasks.

**Q: What is an unhandled rejection?**
A rejected promise nobody handles. Browsers log "Uncaught (in promise)"; Node crashes by default since v15.

**Q: How do you run promises in parallel with async/await?**
Start them, then `await Promise.all([...])` (or `allSettled`), instead of awaiting each one in sequence.

---

## 🎯 Interview answer

> "A Promise represents a value that arrives later. It starts pending and settles once, either fulfilled with a value or rejected with a reason. The executor runs synchronously, and its callbacks run later as microtasks. `.then` returns a new promise, so chains pass values along: returning a value fulfils the next step, returning a promise waits for it, and throwing rejects and skips to the next `.catch`. A `.catch` that returns a value recovers the chain, and `.finally` runs either way without changing the value. A common bug is forgetting to return inside `.then`. `async`/`await` is syntax over promises: an async function always returns a promise, `await` pauses only that function, and a rejected await throws, so I use try/catch/finally. For independent calls I start them together with `Promise.all` or `allSettled` instead of awaiting sequentially. Importantly, fetch only rejects on network errors, not on HTTP errors, so I wrap it in a helper that checks `res.ok` and throws an HttpError with the status and body. Then I handle cases explicitly: validation errors on 400 or 422 next to the form fields, 401 redirects to login or refreshes the token, 403 shows a permission message, 404 a not-found state, 429 waits and retries, and 5xx shows a retry message, plus timeouts and offline errors. I make sure every promise is awaited or returned so nothing becomes an unhandled rejection, and I log those globally."
