## Short answer

`useLocation()` returns an object describing the **current URL**:

```jsx
import { useLocation } from 'react-router-dom'

const location = useLocation()

// URL: /products?search=phone&page=2#reviews
{
  pathname: '/products',               // the path
  search: '?search=phone&page=2',      // ⭐ query string (raw text)
  hash: '#reviews',                    // after #
  state: { from: '/cart' },            // ⭐ navigation state (hidden data)
  key: 'x7k2p',                        // unique id for this history entry
}
```

| You want | Where it is |
|---|---|
| **Query parameters** (`?search=phone`) | `location.search`, parsed with `URLSearchParams` |
| **Navigation state** (hidden data passed while navigating) | `location.state` |

---

## Query parameters

`location.search` is **plain text** (`"?search=phone&page=2"`), so parse it with the browser's **`URLSearchParams`**:

```jsx
import { useLocation } from 'react-router-dom'

function Products() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const search = params.get('search')            // "phone"
  const page = Number(params.get('page')) || 1   // "2" → 2 (values are always strings!)
  const sort = params.get('sort') ?? 'newest'    // missing → null → default

  return <p>Searching "{search}", page {page}, sorted by {sort}</p>
}
```

**Useful `URLSearchParams` methods:**

```js
params.get('page')          // "2" or null
params.has('search')        // true
params.getAll('tag')        // ?tag=a&tag=b → ['a', 'b']
params.toString()           // "search=phone&page=2"
```

---

## useSearchParams

**Simpler for query parameters: it can read AND update.**

```jsx
import { useSearchParams } from 'react-router-dom'

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const page = Number(searchParams.get('page')) || 1

  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearchParams({ search: e.target.value, page: 1 })}   // updates the URL
      />
      <button onClick={() => setSearchParams({ search, page: page + 1 })}>Next page</button>
    </>
  )
}
```

**Use `useLocation` to read; use `useSearchParams` when you also need to change the query.**

---

## Navigation state

**Navigation state is data you pass to the next page without putting it in the URL.**

### Step 1: Send state when navigating

```jsx
// with <Link>
<Link to="/order-success" state={{ orderId: 123, total: 499 }}>Place order</Link>

// or with useNavigate
const navigate = useNavigate()
navigate('/order-success', { state: { orderId: 123, total: 499 } })
```

### Step 2: Read it on the next page

```jsx
function OrderSuccess() {
  const location = useLocation()
  const order = location.state                  // { orderId: 123, total: 499 }

  if (!order) return <p>No order found.</p>     // ⚠️ always handle missing state

  return <p>✅ Order #{order.orderId} placed. Total ₹{order.total}</p>
}
```

---

## Redirect after login

**The most common use:** the user opens `/dashboard`, isn't logged in, is sent to `/login`, logs in, and goes **back to `/dashboard`** (not the home page).

```jsx
// ProtectedRoute: remember where the user wanted to go
function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
```

```jsx
// Login: read it and go back there
function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from || '/'      // fallback if opened directly

  async function handleSubmit(e) {
    e.preventDefault()
    await login(email, password)
    navigate(from, { replace: true })           // ✅ back to /dashboard
  }
}
```

**Other uses:**

- **A success or flash message after a redirect:** `navigate('/users', { state: { message: 'User created!' } })`.
- **Passing an item you already loaded** to a details page, so it shows instantly while fresh data loads.
- **Modal routes:** remember the background page.

---

## Query vs state

| | **Query params** `?search=phone` | **Navigation state** |
|---|---|---|
| Visible in the URL | ✅ yes | ❌ no (hidden) |
| Shareable / bookmarkable | ✅ yes | ❌ no |
| Survives refresh | ✅ yes | ⚠️ in the same tab yes (stored in browser history); lost in a new tab or when shared |
| Data type | strings only | any serialisable data (objects, arrays) |
| Best for | search, filters, pagination, tabs | "where did I come from", one-time messages, passing data you already have |

**Rule:**

- **If the user should be able to share or bookmark it, use query params.**
- **If it's temporary, private context for the next page, use state.**
- **Never rely only on state for required data.** Always handle `location.state` being `undefined`, for example when the page is opened directly.

### Bonus: react to every URL change

```jsx
function PageTracker() {
  const location = useLocation()

  useEffect(() => {
    analytics.pageView(location.pathname + location.search)   // runs on every navigation
  }, [location])

  return null
}
```

---

## Quick Q&A

**Q: How do you read `?id=5` with `useLocation`?**
`new URLSearchParams(useLocation().search).get('id')` returns `"5"`, a string.

**Q: `useLocation` vs `useSearchParams` for query params?**
Both can read. `useSearchParams` gives a ready-parsed object **plus a setter** to update the URL. `useLocation` gives the raw `search` string plus `pathname`, `hash` and `state`.

**Q: How do you pass data to another route without the URL?**
Navigation state: `<Link to="/x" state={...}>` or `navigate('/x', { state })`, then read `useLocation().state`.

**Q: Why might `location.state` be `undefined`?**
The page was opened **directly** (typed URL, new tab, shared link, bookmark) instead of through your `Link` or `navigate`, so always add a fallback.

**Q: `useParams` vs query params?**
`useParams` reads **path segments** defined in the route (`/users/:id` gives `id`). Query params are **optional extras** after `?` (`?tab=posts`).

---

## 🎯 Interview answer

> "`useLocation` returns the current location object with `pathname`, `search`, `hash`, `state` and `key`. For query parameters, `location.search` is the raw string, so I parse it with `new URLSearchParams(location.search)` and call `.get('page')`, remembering that values are strings and may be null. If I also need to update the query, I prefer `useSearchParams`, which returns the parsed params and a setter. For navigation state, I pass data with `<Link to='/x' state={...}>` or `navigate('/x', { state })`, and read it on the next page with `location.state`. It doesn't appear in the URL, so it suits temporary context like the page to return to after login, where a `ProtectedRoute` redirects with `state={{ from: location.pathname }}` and the login page navigates back to `location.state?.from` or a fallback. I use query params for anything shareable like search, filters and pagination, and state for private, one-off data, always handling the case where state is undefined because the page was opened directly."
