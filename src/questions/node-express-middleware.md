## Short answer

**Middleware is a function that runs between receiving a request and sending the response.** It can **read or change `req` and `res`**, **end the request**, or call **`next()`** to pass control to the next middleware.

```js
function middleware(req, res, next) {
  // do something
  next()            // → next middleware / route
}
```

**Analogy: airport security** ✈️

- **Each checkpoint (middleware)** inspects the passenger (request): ticket check, ID check, bag scan.
- **Pass?** Go to the next checkpoint (`next()`).
- **Fail?** You're stopped right there (`res.status(401).send(...)`), and you never reach the gate (the route).

---

## Request flow

```
Request
  │
  ▼
[ helmet ]  →  [ cors ]  →  [ express.json() ]  →  [ logger ]  →  [ auth ]  →  route handler
                                                                   │ no token?
                                                                   └─▶ 401, stop here

Any next(err)  ──────────────────────────────────────────────▶  [ error middleware ]
```

**Order matters: middleware runs in the order you `app.use()` it.**

---

## Writing middleware

### Logger (do something and continue)

```js
function logger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`)
  })
  next()                                  // ⚠️ forget this → the request hangs forever
}

app.use(logger)
```

### Auth (stop or continue)

```js
const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]       // "Bearer <token>"
  if (!token) return res.status(401).json({ message: 'Not logged in' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)     // attach data for later handlers
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

app.get('/profile', requireAuth, (req, res) => {
  res.json({ user: req.user })                               // set by requireAuth
})
```

### Middleware with options (a factory)

```js
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ message: 'Forbidden' })
    next()
  }
}

app.delete('/users/:id', requireAuth, requireRole('admin'), deleteUser)
```

---

## Types of middleware

| Type | Example |
|---|---|
| **Application-level** | `app.use(logger)`, which runs for every request |
| **Path-scoped** | `app.use('/api', apiLimiter)`, only for `/api/*` |
| **Route-level** | `app.get('/admin', requireAuth, handler)` |
| **Router-level** | `router.use(...)` inside an `express.Router()` |
| **Built-in** | `express.json()`, `express.urlencoded()`, `express.static('public')` |
| **Third-party** | `helmet`, `cors`, `morgan`, `express-rate-limit`, `compression`, `cookie-parser` |
| **Error-handling** | `(err, req, res, next) => {}`: **4 arguments**, registered **last** |

---

## Typical setup order

```js
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const app = express()

app.use(helmet())                                         // 1. security headers
app.use(cors({ origin: 'https://myapp.com', credentials: true }))   // 2. CORS
app.use(express.json({ limit: '1mb' }))                   // 3. parse JSON bodies (with a size limit)
app.use(logger)                                           // 4. logging
app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }))   // 5. rate limit the API

app.use('/api/users', usersRouter)                        // 6. routes

app.use((req, res) => res.status(404).json({ message: 'Not found' }))   // 7. 404 (no route matched)

app.use((err, req, res, next) => {                        // 8. error handler (LAST)
  console.error(err)
  res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Server error' })
})
```

**Why this order?**

- **Body parsing must come before routes**, or `req.body` is `undefined`.
- **The 404 handler goes after all routes.**
- **The error handler goes last.**

---

## next() variations

| Call | Effect |
|---|---|
| `next()` | Go to the next middleware |
| `next(err)` | **Skip** normal middleware and jump to the **error middleware** |
| `next('route')` | Skip the remaining handlers **of this route** |
| Sending a response (`res.json`) | Ends the request, so **don't call `next()` after it** |

**Common mistakes:**

```js
// ❌ "Cannot set headers after they are sent"
if (!user) res.status(404).send('Not found')   // missing `return`
res.json(user)                                 // runs too → error

// ✅
if (!user) return res.status(404).send('Not found')
res.json(user)
```

```js
// ❌ request hangs forever: no response and no next()
app.use((req, res, next) => {
  console.log('hi')
})
```

---

## Quick Q&A

**Q: What is middleware in Express?**
A function `(req, res, next)` in the request pipeline that can modify the request or response, end the request, or call `next()` to continue.

**Q: Does order matter?**
Yes. Middleware runs in registration order: parsers before routes, the 404 handler after routes, the error handler last.

**Q: How is error middleware different?**
It has four parameters, `(err, req, res, next)`, and runs only when `next(err)` is called or an error is thrown (async errors are forwarded automatically in Express 5).

**Q: What happens if you forget `next()`?**
If you also don't send a response, the request hangs until it times out.

**Q: How do you pass data between middleware?**
Attach it to `req` (for example `req.user`) or `res.locals`.

**Q: What does `express.json()` do?**
It parses JSON request bodies into `req.body`. Set a `limit` to protect against huge payloads.

---

## 🎯 Interview answer

> "In Express, middleware is a function with the signature `(req, res, next)` that sits in the request pipeline. It can read or modify the request and response, end the request by sending a response, or call `next()` to pass control on. Middleware runs in the order it's registered, so a typical app adds security headers with helmet, CORS, body parsing with `express.json()` and a size limit, logging and rate limiting, then the routes, then a 404 handler, and finally an error-handling middleware with four arguments. For example, an auth middleware reads the bearer token, verifies the JWT, attaches `req.user` and calls `next`, or returns 401. Calling `next(err)` skips to the error handler. Common bugs are forgetting `next()`, which hangs the request, and sending a response without returning, which causes 'headers already sent' errors."
