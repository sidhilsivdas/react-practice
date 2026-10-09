## Quick answer

**CORS (Cross-Origin Resource Sharing)** is how a **server tells the browser** which other websites may read its responses.

- By default, the browser's **same-origin policy** stops JavaScript on `https://shop.com` from reading a response from `https://api.other.com`.
- The server opts in with **`Access-Control-Allow-*` response headers**.
- **Cookies** are only sent cross-origin when the frontend asks (`credentials: 'include'`) **and** the server allows it (`Access-Control-Allow-Credentials: true` + an **exact** origin, never `*`).

**CORS is enforced by the browser, not the server.** Postman and curl ignore it.

---

## What is an origin

**Origin = scheme + host + port.** All three must match for "same origin".

| Page | Request to | Same origin? |
|---|---|---|
| `https://shop.com` | `https://shop.com/api/cart` | ✅ yes |
| `https://shop.com` | `http://shop.com/api` | ❌ different scheme |
| `https://shop.com` | `https://api.shop.com` | ❌ different host (subdomain) |
| `http://localhost:5173` | `http://localhost:3000` | ❌ different port |

**Same-site is a different, looser idea** (used by cookies' `SameSite`): same **scheme + registrable domain**. `app.shop.com` and `api.shop.com` are **cross-origin but same-site**.

---

## Simple vs preflight requests

**Simple request:** the browser sends it directly and checks the response headers.
- Method is `GET`, `HEAD` or `POST`.
- Only "safe" headers (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`).
- `Content-Type` is only `text/plain`, `multipart/form-data` or `application/x-www-form-urlencoded`.

**Anything else triggers a preflight:** the browser first sends an `OPTIONS` request to ask permission. Common triggers in React apps:
- `Content-Type: application/json`
- An `Authorization` header (Bearer token)
- `PUT`, `PATCH`, `DELETE`
- Custom headers like `X-Request-Id`

```
Browser (https://shop.com)                         API (https://api.shop.com)
  │  OPTIONS /orders                                    │
  │  Origin: https://shop.com                           │
  │  Access-Control-Request-Method: POST                │
  │  Access-Control-Request-Headers: content-type, authorization
  │ ───────────────────────────────────────────────────▶│
  │  204 No Content                                     │
  │  Access-Control-Allow-Origin: https://shop.com      │
  │  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  │  Access-Control-Allow-Headers: Content-Type, Authorization
  │  Access-Control-Allow-Credentials: true             │
  │  Access-Control-Max-Age: 600                        │
  │ ◀───────────────────────────────────────────────────│
  │  POST /orders   (the real request)                  │
  │ ───────────────────────────────────────────────────▶│
  │  200 OK + Access-Control-Allow-Origin: https://shop.com
  │ ◀───────────────────────────────────────────────────│
```

**Important:** for a **simple** request, the server **still receives and runs** it. CORS only stops your JavaScript from **reading** the response. That's why CORS is not CSRF protection (see **XSS, CSRF & DOMPurify**).

---

## All the CORS headers

**Request headers (the browser sets these; you can't):**

| Header | Meaning |
|---|---|
| `Origin` | Who is asking: `https://shop.com` |
| `Access-Control-Request-Method` | (Preflight) the method the real request will use |
| `Access-Control-Request-Headers` | (Preflight) the non-safe headers the real request will send |

**Response headers (the server sets these):**

| Header | Example | What it does |
|---|---|---|
| `Access-Control-Allow-Origin` | `https://shop.com` or `*` | Which origin may read the response. **One value only**, not a list. |
| `Access-Control-Allow-Credentials` | `true` | Allows cookies / auth to be included and the response read. Requires an exact origin. |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, DELETE` | (Preflight) allowed methods |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization` | (Preflight) allowed request headers |
| `Access-Control-Expose-Headers` | `X-Total-Count, ETag` | Which **response** headers JS may read. By default only a few are readable: `Cache-Control`, `Content-Language`, `Content-Length`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma`. |
| `Access-Control-Max-Age` | `600` | Seconds the browser can cache the preflight. Chrome caps it at 2 hours. |
| `Vary` | `Origin` | **Needed when the server picks the origin dynamically**, so CDNs and caches don't serve shop.com's response to another origin |

**Rules people get wrong:**
- `Access-Control-Allow-Origin: https://a.com, https://b.com` is **invalid**. Check the request's `Origin` against an allow-list and echo back **the one** that matches.
- With credentials, `*` is not allowed in `Allow-Origin`, and `*` in `Allow-Headers` / `Allow-Methods` / `Expose-Headers` is treated as the literal text "*", not a wildcard.
- **Never reflect any `Origin` with credentials enabled.** Then every website can read your users' data. Also never allow the `null` origin.

---

## Cookies across origins

**Three things must all be true for a cookie to travel with a cross-origin `fetch`:**

**1. The frontend opts in:**

```js
// fetch
const res = await fetch('https://api.shop.com/me', { credentials: 'include' })

// axios
const api = axios.create({ baseURL: 'https://api.shop.com', withCredentials: true })
```

`credentials` options: `'omit'` (never), `'same-origin'` (the **default**: only same-origin), `'include'` (always).

**2. The server allows it:**

```http
Access-Control-Allow-Origin: https://shop.com     ← exact origin
Access-Control-Allow-Credentials: true
Vary: Origin
```

**3. The cookie's attributes allow it:**

```http
Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=shop.com; Max-Age=3600
```

| Attribute | Meaning |
|---|---|
| `HttpOnly` | JavaScript can't read it (`document.cookie`), so XSS can't steal it |
| `Secure` | Only sent over HTTPS (localhost is treated as secure in modern browsers) |
| `SameSite=Strict` | Only sent on same-site requests, not even when clicking a link from another site |
| `SameSite=Lax` | **The browser default.** Same-site requests + top-level navigations (clicking a link). Not sent on cross-site `fetch`/POST. |
| `SameSite=None` | Sent cross-site too. **Requires `Secure`.** |
| `Domain=shop.com` | Shared with all subdomains (`app.shop.com`, `api.shop.com`). Without `Domain`, only the exact host that set it. |
| `Path`, `Max-Age` / `Expires` | Where it's sent; how long it lives (no expiry = session cookie) |

**Which setup do you have?**

| Frontend → API | Cookie needs | Works reliably? |
|---|---|---|
| `shop.com` → `shop.com/api` (same origin) | Nothing special; **no CORS at all** | ✅ best |
| `app.shop.com` → `api.shop.com` (same-site) | CORS with credentials; `SameSite=Lax` is fine; `Domain=shop.com` if both read it | ✅ good |
| `shop.com` → `shop-api.io` (cross-site) | CORS with credentials + `SameSite=None; Secure` | ⚠️ it's a **third-party cookie**: Safari and Firefox block it by default, and users can block it in Chrome |

**Recommendation:** keep the API on the **same site** (a subdomain), or proxy it through the same origin (`/api` → backend via Nginx, a CDN or a BFF). Then cookies just work and there's often no CORS at all.

---

## Server configuration

**Express (`cors` package):**

```js
import express from 'express'
import cors from 'cors'

const allowList = ['https://shop.com', 'https://admin.shop.com']
if (process.env.NODE_ENV !== 'production') allowList.push('http://localhost:5173')

app.use(cors({
  origin(origin, callback) {
    // no Origin = same-origin or server-to-server (curl): allow, CORS doesn't apply
    if (!origin || allowList.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,                                   // Access-Control-Allow-Credentials: true
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 600,                                         // cache the preflight for 10 minutes
}))
// cors() echoes back the matching origin, adds Vary: Origin, and answers OPTIONS preflights

// setting the cookie at login
app.post('/login', (req, res) => {
  res.cookie('session', token, {
    httpOnly: true, secure: true, sameSite: 'lax', domain: 'shop.com', maxAge: 60 * 60 * 1000,
  })
  res.sendStatus(204)
})
```

**The same thing by hand** (to understand what the package does):

```js
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && allowList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
  }
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.setHeader('Access-Control-Max-Age', '600')
    return res.sendStatus(204)
  }
  next()
})
```

**Fastify:**

```js
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'

await app.register(cors, {
  origin: ['https://shop.com', 'https://admin.shop.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
})
await app.register(cookie)
// reply.setCookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
```

**Nginx** (when Nginx answers instead of the app):

```nginx
map $http_origin $cors_origin {
  default "";
  "https://shop.com"        $http_origin;
  "https://admin.shop.com"  $http_origin;
}

server {
  location /api/ {
    if ($request_method = OPTIONS) {
      add_header Access-Control-Allow-Origin $cors_origin always;
      add_header Access-Control-Allow-Credentials true always;
      add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE" always;
      add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
      add_header Access-Control-Max-Age 600 always;
      add_header Vary Origin always;
      return 204;
    }
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Credentials true always;
    add_header Vary Origin always;
    proxy_pass http://backend:3000/;
  }
}
```

`always` makes Nginx add the header on error responses (4xx/5xx) too. Without it, a 401 looks like a CORS error in the browser. **Configure CORS in one place only** (app *or* proxy): two `Access-Control-Allow-Origin` headers is also an error.

**Avoiding CORS entirely: same-origin proxy**

```js
// vite.config.js (development): the browser calls /api on localhost:5173, Vite forwards it
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
```

```nginx
# production: serve the React build and the API from the same origin
location /      { root /var/www/shop; try_files $uri /index.html; }
location /api/  { proxy_pass http://backend:3000/; }
```

---

## Other security headers

**These aren't CORS, but are usually set in the same server config** (Express: `helmet()`; Fastify: `@fastify/helmet`):

| Header | Example | Protects against |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-…'; frame-ancestors 'none'` | XSS (injected scripts won't run), clickjacking |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Downgrade to HTTP, cookie theft over HTTP |
| `X-Content-Type-Options` | `nosniff` | The browser guessing that a file is a script |
| `X-Frame-Options` | `DENY` | Clickjacking (older; `frame-ancestors` in CSP replaces it) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leaking full URLs (tokens, IDs) to other sites |
| `Permissions-Policy` | `camera=(), geolocation=()` | Pages or iframes using powerful APIs |
| `Cross-Origin-Opener-Policy` | `same-origin` | Other windows getting a reference to yours (and enables isolation) |
| `Cross-Origin-Resource-Policy` | `same-site` | Other sites embedding your resources (images, scripts) |
| `Cache-Control` | `no-store` (private API data) / `public, max-age=31536000, immutable` (hashed JS/CSS) | Private data cached by shared caches; slow repeat loads |

```js
import helmet from 'helmet'
app.use(helmet())   // sensible defaults for most of the above; customise the CSP for your app
```

---

## Common errors

**The exact Chrome console messages and their fixes:**

| Error (Chrome console) | Cause | Fix |
|---|---|---|
| `No 'Access-Control-Allow-Origin' header is present on the requested resource.` | The server didn't send it (or crashed, or a proxy or error page dropped it) | Add CORS on the server; check that 4xx/5xx responses carry it too |
| `The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'.` | `credentials: 'include'` + `*` | Echo the exact origin from an allow-list |
| `The value of the 'Access-Control-Allow-Credentials' header in the response is '' which must be 'true' when the request's credentials mode is 'include'.` | Credentials header missing | `Access-Control-Allow-Credentials: true` |
| `Response to preflight request doesn't pass access control check` | The `OPTIONS` request failed (401 from auth middleware, 404, a redirect) | Answer `OPTIONS` **before** auth; no redirects on preflight |
| `Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response.` | The header isn't in the allow-list | Add it to `Access-Control-Allow-Headers` |
| `The 'Access-Control-Allow-Origin' header contains multiple values` | CORS set in both Nginx and the app | Configure it in one place |
| Request works, but `res.headers.get('X-Total-Count')` is `null` | The header isn't exposed | `Access-Control-Expose-Headers: X-Total-Count` |
| Cookie not sent / not saved | Missing `credentials: 'include'`, `SameSite=Lax` on a cross-site API, or third-party cookies blocked | See **Cookies across origins**; prefer a same-site API |

**Debugging tips:**
- **DevTools → Network:** look at the `OPTIONS` request first, then the real one. The Response Headers show what the server actually sent.
- **Application → Cookies:** a yellow warning icon explains why a cookie was blocked (SameSite, Secure, domain).
- **A "CORS error" is often another error in disguise:** a 500 or 401 page without CORS headers shows up as a CORS failure. Check the server logs.
- `mode: 'no-cors'` **doesn't fix anything.** It gives you an "opaque" response you can't read.

---

## Interview Q&A

**Q: Is CORS a server security feature?**
No. It's a **browser** feature that *relaxes* the same-origin policy. The server only declares who may read its responses. Non-browser clients ignore it, so you still need authentication and authorisation on the API.

**Q: Why does my request work in Postman but not in the browser?**
Postman isn't a browser and doesn't enforce the same-origin policy. Add the right CORS headers on the server, or use a same-origin proxy.

**Q: Why is an `OPTIONS` request appearing before my POST?**
That's a preflight. `Content-Type: application/json`, an `Authorization` header, or methods like `PUT`/`DELETE` make the request non-simple. Cache it with `Access-Control-Max-Age`.

**Q: Can I use `Access-Control-Allow-Origin: *` with cookies?**
No. With credentials, the server must echo an exact origin, send `Access-Control-Allow-Credentials: true` and add `Vary: Origin`.

**Q: Does CORS protect against CSRF?**
Not by itself. Simple requests (like a form POST) are still **sent** and processed; CORS only blocks reading the response. Use `SameSite` cookies and CSRF tokens.

**Q: How do you avoid CORS altogether?**
Serve the frontend and API from the same origin: a Vite dev proxy locally, and Nginx, a CDN or a BFF routing `/api` in production.

---

## 🎯 Interview answer

> "Browsers enforce the same-origin policy, where an origin is scheme, host and port, so JavaScript can't read a response from another origin unless the server allows it with CORS headers. For simple GET or form-style POST requests, the browser sends the request and checks `Access-Control-Allow-Origin` on the response; anything with a JSON content type, an `Authorization` header or methods like PUT and DELETE first triggers an `OPTIONS` preflight, which the server answers with the allowed methods, headers and a `Max-Age`. For cookies, the frontend must send `credentials: 'include'` or axios `withCredentials`, and the server must echo the exact origin from an allow-list, never `*`, with `Access-Control-Allow-Credentials: true` and `Vary: Origin`. The cookie itself should be `HttpOnly`, `Secure` and `SameSite=Lax` when the API is on the same site, like `api.shop.com`; a truly cross-site API needs `SameSite=None; Secure` and is blocked as a third-party cookie in many browsers, so I prefer a subdomain or a same-origin proxy, which avoids CORS entirely. On the server, I use the `cors` package in Express or `@fastify/cors`, answer preflights before auth middleware, configure CORS in only one layer, use `always` in Nginx so error responses keep their headers, and add security headers like CSP, HSTS, `nosniff` and `Referrer-Policy` with helmet. Finally, CORS isn't CSRF protection or API security; the server still needs authentication, authorisation and CSRF defences."
