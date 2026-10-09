## Short answer

**React Router lets a single-page app (SPA) show different pages for different URLs without reloading the page.**

- **A normal website:** clicking a link **asks the server for a new HTML page**. The page reloads and the screen goes white.
- **With React Router:** clicking a link **changes the URL in JavaScript**. React Router sees the new URL and **swaps the component** on screen, **instantly**, with no reload. React state (cart, logged-in user) is **kept**.

**Analogy: a TV with channels** 📺

- **The TV (your React app) is switched on once** (one HTML page).
- **Changing the channel (URL)** just shows a different programme (component). You don't buy a new TV each time.
- **The remote's channel list** = your **routes**: `/` = Home, `/about` = About.

> **Versions:** in **v6**, you import from `'react-router-dom'`. From **v7 onwards** (this project uses v8), the same APIs come from `'react-router'`. The code is the same.

---

## How it works

The browser has a **History API** that can change the URL **without reloading**:

```js
window.history.pushState({}, '', '/about')   // URL changes, NO reload, NO server request
window.addEventListener('popstate', ...)     // fires when the user clicks Back / Forward
```

**React Router uses exactly this:**

```
1. <BrowserRouter> stores the current URL (location) in React state
   and listens to 'popstate' (Back/Forward buttons)

2. User clicks <Link to="/about">
   → it's a real <a href="/about">, but onClick does:
       e.preventDefault()                     ← stop the browser reload
       history.pushState({}, '', '/about')    ← change the URL
       update the location state               ← tell React

3. Location state changed → React re-renders
   → <Routes> compares the URL with each <Route path>
   → finds the best match → renders its element (<About />)

4. User clicks Back → browser fires 'popstate'
   → Router updates location state → re-render → previous page shows
```

---

## Mini router

**A router in ~20 lines** (great for interviews):

```jsx
import { useEffect, useState } from 'react'

// change the URL + tell everyone
function navigate(to) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))   // pushState doesn't fire popstate itself
}

// read the current path and re-render when it changes
function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)       // Back/Forward + our navigate()
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}

function Link({ to, children }) {
  return (
    <a href={to} onClick={(e) => { e.preventDefault(); navigate(to) }}>
      {children}
    </a>
  )
}

function Route({ path, element }) {
  return usePath() === path ? element : null
}

// Usage
function App() {
  return (
    <>
      <Link to="/">Home</Link> | <Link to="/about">About</Link>
      <Route path="/" element={<h1>Home</h1>} />
      <Route path="/about" element={<h1>About</h1>} />
    </>
  )
}
```

**That's the core idea.** React Router adds **dynamic params, nested routes, ranking the best match, data loading** and much more.

---

## Setup

### Step 1: Install

```bash
npm install react-router-dom
```

### Step 2: Wrap the app in a router (`main.jsx`)

```jsx
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

### Step 3: Define routes (`App.jsx`)

```jsx
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/users/:id" element={<UserDetail />} />   {/* dynamic segment */}
      <Route path="*" element={<NotFound />} />              {/* 404: anything else */}
    </Routes>
  )
}
```

### Step 4: Navigate with links

```jsx
import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav>
      <Link to="/">Home</Link>

      {/* NavLink knows if it's the current page → style the active link */}
      <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
        About
      </NavLink>
    </nav>
  )
}
```

**⚠️ Don't use `<a href="/about">`.** It **reloads the whole page** and loses React state.

---

## Router hooks

### `useParams`: read dynamic URL parts

```jsx
// Route: /users/:id     URL: /users/42
function UserDetail() {
  const { id } = useParams()           // "42" (always a string!)
  return <h1>User {id}</h1>
}
```

### `useNavigate`: go to a page from code

```jsx
function LoginForm() {
  const navigate = useNavigate()

  async function handleLogin() {
    await login()
    navigate('/dashboard')               // go to dashboard
    // navigate('/login', { replace: true })   → replace the history entry (Back skips it)
    // navigate(-1)                            → go back
  }
}
```

### `useSearchParams`: query string (`?search=react&page=2`)

```jsx
function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''

  return (
    <input
      value={search}
      onChange={(e) => setSearchParams({ search: e.target.value })}   // URL: ?search=...
    />
  )
}
```

**Filters live in the URL**, so they're **shareable** and **survive a refresh**. (This site's search box uses exactly this.)

### `useLocation`: the current location object

```jsx
const location = useLocation()
// { pathname: '/users/42', search: '?tab=posts', hash: '', state: {...}, key: 'abc' }
```

Use it to read `pathname`, or `state` passed during navigation (see the **useLocation** question).

---

## Nested routes & Outlet

**Shared layout** (navbar and sidebar) with **changing content** in the middle:

```jsx
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>             {/* parent = layout */}
        <Route index element={<Home />} />              {/* "/"  (index = default child) */}
        <Route path="about" element={<About />} />      {/* "/about" */}
        <Route path="users" element={<Users />}>
          <Route path=":id" element={<UserDetail />} /> {/* "/users/42" */}
        </Route>
      </Route>
    </Routes>
  )
}

function Layout() {
  return (
    <>
      <Navbar />                {/* stays on every page */}
      <main>
        <Outlet />              {/* ← the matching child route renders HERE */}
      </main>
      <Footer />
    </>
  )
}
```

```
URL /about      →  Layout ( Navbar + <About /> + Footer )
URL /users/42   →  Layout ( Navbar + Users ( <UserDetail /> ) + Footer )
```

**`<Outlet />` is a placeholder for the child route.** That's how nested layouts work.

---

## Redirects & guards

```jsx
import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute />}>                 {/* guard a group of routes */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  <Route path="/old-page" element={<Navigate to="/new-page" replace />} />   {/* redirect */}
</Routes>
```

(See the **Auth flow** question for the full login + token version.)

### Lazy-load pages (smaller bundle)

```jsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))   // loaded only when visited
const Settings = lazy(() => import('./pages/Settings'))

<Suspense fallback={<p>Loading page...</p>}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

**Each page becomes its own JavaScript file**, so the first load is faster.

---

## Browser vs Hash router

| | **BrowserRouter** | **HashRouter** | **MemoryRouter** |
|---|---|---|---|
| URL looks like | `site.com/about` ✅ clean | `site.com/#/about` | URL doesn't change |
| Uses | History API (`pushState`) | the part after `#` | memory only |
| Server setup needed? | ⚠️ **yes** | ❌ no | ❌ no |
| Best for | most apps, good for SEO | **static hosts like GitHub Pages** | tests, React Native |

### Why does BrowserRouter need server setup? ⭐

1. **The user is on `site.com/about` and presses refresh** (or opens the link in a new tab).
2. **The browser asks the server for the file `/about`.**
3. **The server has no `/about` file, only `index.html`**, so it returns **404** ❌.

**✅ Fix:** configure the server to **send `index.html` for every route** (an SPA fallback). React Router then reads the URL and shows the right page.

- **Netlify:** a `_redirects` file containing `/*  /index.html  200`.
- **Vercel or nginx:** a rewrite rule to `index.html`.
- **GitHub Pages can't do rewrites**, which is why **this site uses `HashRouter`**. Everything after `#` is **never sent to the server**, so a refresh always loads `index.html`.

---

## Data routers

**v6.4+ / v7, the modern way:**

```jsx
import { createBrowserRouter, RouterProvider, useLoaderData } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/users/:id',
    element: <UserDetail />,
    loader: ({ params }) => fetch(`/api/users/${params.id}`),   // load data BEFORE rendering
  },
])

function UserDetail() {
  const user = useLoaderData()          // data is ready, no useEffect, no loading state
  return <h1>{user.name}</h1>
}

createRoot(root).render(<RouterProvider router={router} />)
```

**Loaders fetch data while navigating**, so there are no loading spinners on mount. **Actions** handle form submissions. **In v7, it can also run as a full framework** (the former Remix).

---

## Quick Q&A

**Q: How does React Router change pages without a reload?**
`<Link>` prevents the default link behaviour and calls `history.pushState` to change the URL. The router stores the location in state, re-renders, and `<Routes>` renders the matching component. Back/Forward fire `popstate`, which the router listens to.

**Q: `Link` vs `<a>`?**
`<a href>` reloads the whole page and loses React state. `<Link>` updates the URL client-side, without a reload.

**Q: `Link` vs `NavLink`?**
`NavLink` knows whether it's **active** (matches the current URL), so you can style the current page in a menu.

**Q: `useNavigate` vs `<Navigate>`?**
`useNavigate()` returns a **function** you call in event handlers, for example after login. `<Navigate>` is a **component** that redirects when rendered, for example in route guards.

**Q: What is `<Outlet>`?**
A placeholder in a parent (layout) route where the matching **child route** renders.

**Q: What is an index route?**
The **default child** shown at the parent's exact path: `<Route index element={<Home />} />`.

**Q: BrowserRouter vs HashRouter?**
BrowserRouter gives clean URLs using the History API, but needs the server to fall back to `index.html`. HashRouter uses `#/path` and works on any static host, because the hash is never sent to the server.

**Q: Why do I get a 404 on refresh?**
With BrowserRouter, the server is asked for `/about`, which doesn't exist. Add a rewrite to `index.html` (or use HashRouter).

**Q: How do you pass data between routes?**
URL params (`/users/:id`), query strings (`?tab=posts`), navigation state (`navigate('/x', { state: {...} })`, read with `useLocation().state`), or global state (Context, Redux).

**Q: Does route order matter in v6+?**
No. v6+ **ranks routes** and picks the **most specific** match (`/users/new` beats `/users/:id`), unlike v5, where the first match won (inside `<Switch>`).

---

## 🎯 Interview answer

> "React Router enables client-side routing in a single-page app, so different URLs show different components without reloading the page. Internally, `BrowserRouter` keeps the current location in React state and listens to the browser's `popstate` event for Back and Forward. `<Link>` renders a normal anchor, but on click it prevents the default reload and calls `history.pushState` to update the URL, then updates the router's state. That triggers a re-render, and `<Routes>` matches the URL against the route paths, ranking for the most specific match, and renders that route's element. I define routes with `<Routes>` and `<Route>`, use `:id` segments read with `useParams`, query strings with `useSearchParams`, programmatic navigation with `useNavigate`, and nested layouts with `<Outlet>` and index routes. Protected routes render `<Outlet>` or redirect with `<Navigate replace>`, and I lazy-load pages with `React.lazy` and Suspense. With `BrowserRouter`, the server must fall back to `index.html`, otherwise refreshing a deep URL returns 404. On static hosts like GitHub Pages, `HashRouter` avoids that because the part after `#` never reaches the server. Newer versions add data routers with loaders and actions that fetch data during navigation."
