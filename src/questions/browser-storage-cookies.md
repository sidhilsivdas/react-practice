## Short answer

| | **localStorage** | **sessionStorage** | **Cookie** | **HttpOnly cookie** |
|---|---|---|---|---|
| Lifetime | **forever** (until cleared) | until the **tab closes** | until `Expires` / `Max-Age` (or the browser closes if not set) | same as cookie |
| Shared between tabs | ✅ same origin | ❌ **per tab** | ✅ | ✅ |
| Size | ~**5 MB** per origin | ~**5 MB** per origin | ~**4 KB per cookie** | ~4 KB |
| **Sent to the server automatically** | ❌ | ❌ | ✅ **with every request** | ✅ |
| **Readable by JavaScript** | ✅ | ✅ | ✅ `document.cookie` | ❌ **never** |
| Stolen by an XSS script? | ⚠️ yes | ⚠️ yes | ⚠️ yes | ✅ **no** |
| CSRF risk | ✅ none (not sent automatically) | ✅ none | ⚠️ yes (use `SameSite`) | ⚠️ yes (use `SameSite`) |
| Set by | JS | JS | JS or server | **server only** (`Set-Cookie` header) |
| API | sync, strings only | sync, strings only | string parsing (or the Cookie Store API) | — |
| Use for | preferences, theme, drafts, non-sensitive cache | one-tab flows: multi-step form progress, scroll position | small data the **server** needs (locale, consent) | ⭐ **session IDs, refresh tokens** |

**Analogy:**

- **localStorage** = a **notebook you keep at home**. It stays there for years, and only you (the browser's JavaScript) read it.
- **sessionStorage** = **sticky notes on one desk**. They're thrown away when you leave that desk (close the tab).
- **Cookie** = a **badge you wear**. The building (server) sees it at every door, automatically.
- **HttpOnly cookie** = a badge **sealed inside a pouch**. Doors can scan it, but **nobody can take it out and copy it**, not even you (JavaScript).

---

## localStorage

```js
localStorage.setItem('theme', 'dark')
localStorage.getItem('theme')            // 'dark'
localStorage.removeItem('theme')
localStorage.clear()                     // everything for this origin

// ⚠️ strings only: objects must be stringified
localStorage.setItem('cart', JSON.stringify({ items: [1, 2] }))
const cart = JSON.parse(localStorage.getItem('cart') ?? 'null')

localStorage.setItem('count', 5)
typeof localStorage.getItem('count')     // 'string' ("5")
```

**Key facts:**

- **Scoped per origin** (protocol + domain + port): `https://shop.com` and `http://shop.com` don't share it.
- **Persists after closing the browser.** It's only cleared by the user, by your code, or by browser storage policies.
- **Synchronous:** large reads and writes block the main thread. Keep it small.
- **Safari (ITP) may delete script-written storage** after about 7 days without user interaction, so don't treat it as permanent.
- **It can throw:** in some private modes, or when full (`QuotaExceededError`). Wrap it in `try/catch`.

### Sync between tabs: the `storage` event

```js
// fires in OTHER tabs of the same origin when localStorage changes
window.addEventListener('storage', (event) => {
  if (event.key === 'auth:logout') redirectToLogin()   // log out every open tab
})

localStorage.setItem('auth:logout', Date.now())       // in the tab where the user clicked Logout
```

---

## sessionStorage

```js
sessionStorage.setItem('checkoutStep', '2')
sessionStorage.getItem('checkoutStep')   // '2'
```

- **Same API as localStorage**, but **per tab**: each tab has its own.
- **Survives a page reload** in that tab, and is **deleted when the tab closes**.
- **Duplicating a tab copies it**; opening a fresh tab starts empty.

**Use it for:**

- **Wizard or checkout progress.**
- **Restoring scroll position.**
- **Data that shouldn't leak into other tabs**, like a one-time state for an OAuth redirect.

---

## Cookies

**Cookies exist so the server can recognise the browser.** They're sent in the `Cookie` header with every matching request.

```http
Set-Cookie: session=abc123; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax
```

| Attribute | Meaning |
|---|---|
| `Expires` / `Max-Age` | When it's deleted. Without it, it's a **session cookie** (gone when the browser closes). |
| `Domain` / `Path` | Which URLs receive it |
| **`HttpOnly`** | **JavaScript can't read it** (`document.cookie` doesn't show it). Protects against XSS theft. |
| **`Secure`** | Only sent over **HTTPS** |
| **`SameSite=Strict`** | Never sent on cross-site requests |
| **`SameSite=Lax`** (Chrome's default) | Sent on top-level navigations (clicking a link), not on cross-site forms, images or fetch. Blocks most CSRF. |
| `SameSite=None` | Sent cross-site; **requires `Secure`** |
| `Partitioned` | "CHIPS": a third-party cookie stored separately per top-level site |

### Reading and writing cookies from JavaScript (non-HttpOnly only)

```js
document.cookie = 'locale=en-GB; Max-Age=31536000; Path=/; SameSite=Lax'
document.cookie   // 'locale=en-GB; consent=yes' (all readable cookies in ONE string)

const getCookie = (name) =>
  document.cookie.split('; ').find((c) => c.startsWith(name + '='))?.split('=')[1]
```

**Downsides:**

- **Tiny (~4 KB each).**
- **Sent with every request**, which slows requests if you store a lot.
- **An awkward API.**

---

## HttpOnly cookies ⭐

**Set by the server, invisible to JavaScript, sent automatically.**

```js
// server (Express): after login
res.cookie('refreshToken', token, {
  httpOnly: true,       // JS can't read it → XSS can't steal it
  secure: true,         // HTTPS only
  sameSite: 'strict',   // not sent from other sites → CSRF protection
  path: '/auth/refresh',// only sent to the refresh endpoint
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
```

```js
// browser: JS never touches the token
await fetch('/auth/refresh', { method: 'POST', credentials: 'include' })   // cookie attached by the browser

document.cookie   // the refreshToken is NOT here
```

**For cross-origin APIs** (front end on `shop.com`, API on `api.shop.com`):

- **Client:** `credentials: 'include'`.
- **Server:** CORS with `Access-Control-Allow-Credentials: true` and an **exact origin** (no `*`).

---

## Where to store auth tokens

| Option | XSS (malicious script) | CSRF | Verdict |
|---|---|---|---|
| `localStorage` / `sessionStorage` | ❌ the script reads the token and sends it to the attacker | ✅ safe | Simple, but risky |
| Regular cookie | ❌ readable via `document.cookie` | ⚠️ needs SameSite/CSRF tokens | ❌ worst of both |
| **HttpOnly + Secure + SameSite cookie** | ✅ **can't be read** | ✅ mostly handled by SameSite (+ an Origin check) | ⭐ **recommended for refresh tokens and sessions** |
| JS memory (a variable) | ✅ not stored; lost on reload | ✅ | ⭐ good for **short-lived access tokens** |

**The recommended pattern:**

- **The access token lives in memory** (short-lived, about 15 minutes).
- **The refresh token is an HttpOnly + Secure + SameSite cookie.**
- **On page load, call `/auth/refresh`** to get a new access token. (See **Auth flow** in React & JavaScript.)

**Important:**

- **HttpOnly doesn't make XSS harmless.** A script can still make requests **while the page is open**, but it can't **steal** the token to use later from another machine.
- **Preventing XSS** (React's escaping, sanitising HTML, CSP) still comes first.

---

## Other storage

| Storage | Use for |
|---|---|
| **IndexedDB** | Large or structured data, offline apps, files and blobs (asynchronous, hundreds of MB+). Use the `idb` library to make it pleasant. |
| **Cache Storage** (Service Worker) | Offline-capable PWAs: caching responses and assets |
| **In-memory** (state, Redux, React Query cache) | Fast, temporary data; gone on reload |
| **URL** (query params) | Shareable state: filters, search, page |
| **Server** (database) | Anything that must sync across devices or be secure |

---

## What NOT to store client-side

- ❌ **Passwords, card numbers, personal or health data** in localStorage or sessionStorage.
- ❌ **Long-lived tokens readable by JavaScript.**
- ❌ **Anything you trust without checking on the server.** Users can edit all client storage in DevTools (e.g. `isAdmin: true`, a cart price).
- ❌ **Big data in cookies:** it's sent with every request.

---

## In React

```jsx
// persist a setting safely (see the useLocalStorage custom hook question)
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved !== null ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue                      // blocked storage or bad JSON
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // full or blocked: ignore
    }
  }, [key, value])

  return [value, setValue]
}
```

- **Server rendering (Next.js):** `localStorage` and `window` **don't exist on the server**. Read them in `useEffect` or in client components only, or you'll get "window is not defined" errors and hydration mismatches.
- **Cookies work on both sides:** in Next.js, read them on the server with `await cookies()`. That's why auth and locale often use cookies.

---

## Quick Q&A

**Q: localStorage vs sessionStorage?**
Same API and size (~5 MB). localStorage persists forever and is shared across tabs of the same origin; sessionStorage is per tab and cleared when the tab closes.

**Q: Cookies vs localStorage?**
Cookies are small (~4 KB), sent to the server with every request, and can be HttpOnly. localStorage is larger, never sent automatically, and always readable by JavaScript.

**Q: What does HttpOnly do?**
It prevents JavaScript from reading the cookie, so an XSS attack can't steal it, while the browser still sends it with requests.

**Q: What do Secure and SameSite do?**
Secure means the cookie is only sent over HTTPS. SameSite controls cross-site sending: Strict never, Lax only on top-level navigations (the default in Chrome), None always (requires Secure). It's the main CSRF defence.

**Q: Where should a JWT be stored?**
Ideally the refresh token in an HttpOnly + Secure + SameSite cookie and the access token in memory, not in localStorage, because XSS can read localStorage.

**Q: How do you sync logout across tabs?**
Write to localStorage in one tab; other tabs receive the `storage` event and react. (BroadcastChannel is another option.)

**Q: Why does `localStorage` throw "window is not defined" in Next.js?**
Server components and server rendering run in Node, where there's no window or localStorage. Access it only in client code after mount.

---

## 🎯 Interview answer

> "localStorage and sessionStorage are simple synchronous key-value stores of strings, about 5 MB per origin, never sent to the server. localStorage persists until cleared and is shared across tabs, with a storage event to sync them; sessionStorage is per tab and cleared when the tab closes, which suits things like multi-step form progress. Both are fully readable by JavaScript, so any XSS can steal what's in them, which means no tokens or sensitive data there. Cookies are small, about 4 KB, and sent automatically with every matching request, which is why servers use them for sessions. Their attributes matter: HttpOnly hides them from JavaScript so XSS can't read them, Secure limits them to HTTPS, and SameSite (Lax by default in Chrome, Strict for auth) controls cross-site sending and is the main CSRF defence. So for auth I keep the refresh token in an HttpOnly, Secure, SameSite cookie scoped to the refresh path, keep the short-lived access token in memory, and refresh on page load. I still prevent XSS, because HttpOnly only stops theft, not misuse while the page is open. For large or offline data I'd use IndexedDB, and in Next.js I only touch localStorage in client code after mount, while cookies can be read on the server."
