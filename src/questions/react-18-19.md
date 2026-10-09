## Short answer

| Version | Released | Theme | Headline features |
|---|---|---|---|
| **React 18** | Mar 2022 | ⚡ **Performance**: a faster, smoother engine | Concurrent rendering, automatic batching, `useTransition`, `useDeferredValue`, Suspense SSR, `useId` |
| **React 19** | Dec 2024 | ✍️ **Developer experience**: less code | Actions, `useActionState`, `useFormStatus`, `useOptimistic`, `use()`, `ref` as a prop, `<title>` in components |
| **React 19.2** | Oct 2025 | Extras | `<Activity>`, `useEffectEvent` |

---

## createRoot & concurrent

**What:** React can now **pause, interrupt and resume rendering**, so urgent updates like typing aren't blocked by slow ones.

```jsx
// ❌ React 17 (removed in React 19)
import ReactDOM from 'react-dom'
ReactDOM.render(<App />, document.getElementById('root'))

// ✅ React 18+
import { createRoot } from 'react-dom/client'
createRoot(document.getElementById('root')).render(<App />)
```

**Using `createRoot` is what turns on all the React 18 features.**

---

## Automatic batching

**What:** several state updates are grouped into **one re-render**, now **everywhere**: timeouts, promises and fetch callbacks too.

```jsx
function Profile() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(0)

  async function load() {
    const user = await fetch('/api/user').then((r) => r.json())
    setName(user.name)
    setAge(user.age)
    // React 17: 2 re-renders (no batching after await)
    // React 18: 1 re-render ✅
  }
}
```

**Need an update applied immediately?** (rare)

```jsx
import { flushSync } from 'react-dom'
flushSync(() => setName('Sam'))   // DOM updated right now
```

---

## useTransition

**What:** the input stays **instant** while a heavy update (like filtering 10,000 items) happens in the background.

```jsx
import { useState, useTransition } from 'react'

function SearchProducts({ products }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleChange(e) {
    setQuery(e.target.value)                 // 🔴 urgent: show the typed letter now
    startTransition(() => {
      setFilter(e.target.value)              // 🟢 can wait: heavy list update
    })
  }

  const visible = products.filter((p) => p.name.includes(filter))

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <p>Updating list...</p>}
      <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  )
}
```

**If the user keeps typing, React throws away the old, unfinished list render** and starts on the newest one.

---

## useDeferredValue

**What:** like `useTransition`, but for a **value you receive** (for example a prop) rather than a setter you call.

```jsx
import { memo, useDeferredValue, useState } from 'react'

function Search() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)   // updates later if React is busy

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <SlowList query={deferredQuery} />
    </>
  )
}

const SlowList = memo(function SlowList({ query }) {   // memo → skip while deferred value is unchanged
  // ...expensive rendering
})
```

| | `useTransition` | `useDeferredValue` |
|---|---|---|
| You control | the **setter** | the **value** |
| Gives `isPending`? | ✅ | ❌ (compare `query !== deferredQuery`) |

---

## Suspense & lazy

**What:** show a **fallback while something loads**. In React 18, Suspense also works on the **server**, where HTML **streams** in pieces so users see content sooner.

```jsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./Dashboard'))   // separate JS file, loaded on demand

function App() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <Dashboard />
    </Suspense>
  )
}
```

---

## useId & useSyncExternalStore

### `useId`: unique, SSR-safe IDs

```jsx
import { useId } from 'react'

function EmailField() {
  const id = useId()               // e.g. ":r0:", the same on server and client
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input id={id} type="email" />
    </>
  )
}
```

**Why not `Math.random()`?** It differs between server and client, which causes **hydration errors**. It also changes on every render.

### `useSyncExternalStore`: subscribe to outside data

The safe way to read **browser APIs or external stores** (used internally by Redux and Zustand).

```jsx
import { useSyncExternalStore } from 'react'

function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}

function StatusBar() {
  const isOnline = useOnlineStatus()
  return <p>{isOnline ? '✅ Online' : '❌ Offline'}</p>
}
```

**Also in React 18:**

- **StrictMode runs effects twice in development** (setup, cleanup, setup) to catch missing cleanups.
- **`useInsertionEffect`** is for CSS-in-JS library authors, not app code.

---

## Actions (React 19)

**What:** forms can call a function directly. React gives it the **`FormData`**, handles the **pending state**, and **resets the form** after success.

```jsx
function NewsletterForm() {
  async function subscribe(formData) {
    const email = formData.get('email')     // read by input "name"
    await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) })
  }

  return (
    <form action={subscribe}>
      <input name="email" type="email" />
      <button type="submit">Subscribe</button>
    </form>
  )
}
```

**No `onSubmit`, no `e.preventDefault()`, no `useState` for the input.**

`startTransition` also accepts **async** functions now:

```jsx
const [isPending, startTransition] = useTransition()

startTransition(async () => {
  await saveName(name)        // isPending is true until this finishes
})
```

---

## useActionState

**What:** the form's **result, errors and pending state** in one hook.

```jsx
import { useActionState } from 'react'

async function login(previousState, formData) {
  const res = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') }),
  })
  if (!res.ok) return { error: 'Invalid email or password' }   // becomes the new state
  return { error: null }
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, { error: null })

  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button disabled={isPending}>{isPending ? 'Logging in...' : 'Login'}</button>
      {state.error && <p>{state.error}</p>}
    </form>
  )
}
```

**Before React 19, this needed 3 `useState` calls** (`loading`, `error`, `result`) plus `try/catch/finally` in every form.

---

## useFormStatus

**What:** a child component knows whether **its form** is submitting.

```jsx
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()     // reads the PARENT <form>, no props needed
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>
}

function ProfileForm() {
  return (
    <form action={saveProfile}>
      <input name="name" />
      <SubmitButton />                    {/* must be INSIDE the form */}
    </form>
  )
}
```

**It's great for a reusable submit button** in a design system.

---

## useOptimistic

**What:** show the result **instantly**, like a ❤️ turning red straight away. If the request fails, React **rolls it back** automatically.

```jsx
import { useOptimistic, useState, startTransition } from 'react'

function LikeButton({ postId }) {
  const [likes, setLikes] = useState(10)
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (current, amount) => current + amount       // how to apply the optimistic change
  )

  function handleLike() {
    startTransition(async () => {
      addOptimisticLike(1)                       // UI shows 11 immediately ⚡
      const newLikes = await likePost(postId)    // server call
      setLikes(newLikes)                         // real value when it arrives
    })                                           // if it throws → back to 10
  }

  return <button onClick={handleLike}>❤️ {optimisticLikes}</button>
}
```

---

## use()

```jsx
import { use, Suspense, useMemo } from 'react'

// Read a PROMISE: suspends until it resolves
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise)
  return comments.map((c) => <p key={c.id}>{c.text}</p>)
}

function Post() {
  const commentsPromise = useMemo(() => fetchComments(), [])   // create it ONCE, not on every render
  return (
    <Suspense fallback={<p>Loading comments...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  )
}
```

```jsx
// Read CONTEXT: and unlike useContext, it CAN be used inside if/loops
function Heading({ children }) {
  if (!children) return null
  const theme = use(ThemeContext)       // ✅ allowed after an early return
  return <h1 className={theme}>{children}</h1>
}
```

**`use` is the only hook-like API that can be called conditionally.**

---

## ref as a prop

```jsx
// ❌ Before
const MyInput = forwardRef(function MyInput(props, ref) {
  return <input ref={ref} {...props} />
})

// ✅ React 19
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />
}

// Usage is the same
const inputRef = useRef(null)
<MyInput ref={inputRef} />
<button onClick={() => inputRef.current.focus()}>Focus</button>
```

**Ref callbacks can now return a cleanup function:**

```jsx
<div
  ref={(node) => {
    const observer = new ResizeObserver(() => console.log('resized'))
    observer.observe(node)
    return () => observer.disconnect()     // ✅ called when the element is removed
  }}
/>
```

---

## Context, title & meta

### `<Context>` as the provider

```jsx
const ThemeContext = createContext('light')

// ❌ Before
<ThemeContext.Provider value="dark">...</ThemeContext.Provider>

// ✅ React 19
<ThemeContext value="dark">...</ThemeContext>
```

### `<title>` and `<meta>` in any component

```jsx
function ProductPage({ product }) {
  return (
    <>
      <title>{product.name} | My Shop</title>              {/* moved into <head> automatically */}
      <meta name="description" content={product.summary} />
      <h1>{product.name}</h1>
    </>
  )
}
```

**Before, this needed a library like `react-helmet`.**

**Also new: resource preloading APIs:**

```jsx
import { preload, preinit } from 'react-dom'

preload('/fonts/inter.woff2', { as: 'font' })   // start downloading early
preinit('/scripts/analytics.js', { as: 'script' })
```

---

## Server Components

- **Server Components** run **only on the server**, so no JavaScript is sent to the browser for them.
- **Server Actions** let a form call **server code** directly.
- **Both are used through frameworks** like Next.js.

```jsx
// Server Component: can read the database directly
async function ProductList() {
  const products = await db.products.findMany()
  return products.map((p) => <p key={p.id}>{p.name}</p>)
}

// Server Action
async function addProduct(formData) {
  'use server'                                     // this function runs on the server
  await db.products.create({ name: formData.get('name') })
}

<form action={addProduct}>
  <input name="name" />
  <button>Add</button>
</form>
```

**Other React 19 improvements:**

- **Better hydration errors:** a clear diff of what didn't match between server and client.
- **`useDeferredValue(value, initialValue)`:** show an initial value on the first render.
- **Removed** (old APIs): `ReactDOM.render`, string refs, legacy context, `propTypes` checks and `defaultProps` for function components (use default parameters instead: `function Button({ size = 'medium' })`).

---

## React 19.2

### `<Activity>`: hide UI but keep its state

```jsx
import { Activity, useState } from 'react'

function Tabs() {
  const [tab, setTab] = useState('home')

  return (
    <>
      <button onClick={() => setTab('home')}>Home</button>
      <button onClick={() => setTab('search')}>Search</button>

      <Activity mode={tab === 'home' ? 'visible' : 'hidden'}>
        <Home />
      </Activity>
      <Activity mode={tab === 'search' ? 'visible' : 'hidden'}>
        <SearchPage />            {/* typed text and scroll position kept while hidden ✅ */}
      </Activity>
    </>
  )
}
```

**Compared with `{tab === 'search' && <SearchPage />}`**, which **unmounts** the page and **loses its state**. Hidden activities also pause their effects.

### `useEffectEvent`: read the latest values without re-running an effect

```jsx
import { useEffect, useEffectEvent } from 'react'

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast('Connected!', theme)          // always reads the LATEST theme
  })

  useEffect(() => {
    const connection = connect(roomId)
    connection.on('connected', onConnected)
    return () => connection.disconnect()
  }, [roomId])                              // ✅ theme NOT needed: changing it won't reconnect
}
```

**This officially replaces the "latest callback ref" trick** used in custom hooks like `useDebouncedCallback`.

---

## Summary

| React 18 | React 19 |
|---|---|
| `createRoot`, concurrent rendering | Actions (`<form action={fn}>`, async transitions) |
| Automatic batching (`flushSync` to opt out) | `useActionState`: result, error, pending |
| `useTransition`: non-urgent updates | `useFormStatus`: pending inside a child |
| `useDeferredValue`: lagging value | `useOptimistic`: instant UI with rollback |
| Suspense + streaming SSR | `use()`: promises and conditional context |
| `useId`: SSR-safe IDs | `ref` as a prop, ref cleanup |
| `useSyncExternalStore` | `<Context>` provider, `<title>`/`<meta>` in components |
| StrictMode double effects | Server Components and Actions stable |
| | **19.2:** `<Activity>`, `useEffectEvent` |

---

## Quick Q&A

**Q: What is concurrent rendering?**
React can prepare several versions of the UI and **interrupt** a slow render to handle urgent updates first. It's enabled by `createRoot`.

**Q: `useTransition` vs `useDeferredValue`?**
`useTransition` wraps **a state update you make**. `useDeferredValue` defers **a value you receive**. Both mark work as non-urgent.

**Q: What is automatic batching?**
Several `setState` calls produce **one** re-render, even inside timeouts and promises (in React 17, that only happened inside event handlers).

**Q: `useActionState` vs `useFormStatus`?**
`useActionState` belongs in the **form's component** and gives the result, the action and `isPending`. `useFormStatus` is for a **child inside the form**, like a submit button.

**Q: How does `useOptimistic` roll back?**
The optimistic value only lasts while the transition is running. When it ends, React shows the real state again: the updated value on success, or the original on failure.

**Q: Why is `forwardRef` no longer needed?**
In React 19, `ref` is passed to function components as a **normal prop**.

**Q: Can `use()` be called conditionally?**
Yes. It's the only hook-like API allowed inside `if` statements and loops.

---

## 🎯 Interview answer

> "React 18 focused on performance through concurrent rendering, enabled by `createRoot`, which lets React interrupt rendering to keep the UI responsive. It added automatic batching everywhere, `useTransition` and `useDeferredValue` to mark updates as non-urgent, for example keeping a search input instant while a large list filters, Suspense for streaming server rendering, `useId` for SSR-safe IDs, and `useSyncExternalStore` for external stores.
>
> React 19 focused on developer experience, especially forms and async data. Actions let you pass an async function to a form's `action`, and React handles FormData, pending state and form reset. `useActionState` returns the action's result, the action and `isPending`; `useFormStatus` lets a submit button read its form's pending state; and `useOptimistic` updates the UI instantly and rolls back on failure. The `use()` API reads promises with Suspense and can read context conditionally. `ref` is now a normal prop, so `forwardRef` isn't needed, ref callbacks can return cleanups, `<Context>` works as a provider, and `<title>` and meta tags can be rendered from any component. Server Components and Server Actions are stable. React 19.2 added `<Activity>` to hide UI while keeping its state, and `useEffectEvent` to read the latest values in effects without adding dependencies."
