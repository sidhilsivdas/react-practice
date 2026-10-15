## Quick answer

**In the App Router, every component is a Server Component by default.**

- **Server Components:**
  - run **only on the server** (at build time or at request time)
  - can be `async`, and can read databases, files and secrets directly
  - send **no JavaScript** to the browser
  - **can't** use state, effects, event handlers or browser APIs
- **Client Components** (`"use client"` at the top of the file):
  - are **pre-rendered to HTML on the server, then hydrated** in the browser
  - can use `useState`, `useEffect`, `onClick`, `window` and so on

**Rule:** keep most of the tree on the server, and make only the **small interactive "islands"** Client Components.

---

## Server vs Client Components

| | **Server Component** (default) | **Client Component** (`"use client"`) |
|---|---|---|
| Runs | Server only | Server (initial HTML) **and** browser (hydration + interactivity) |
| JavaScript sent to the browser | **None** | Its code + its dependencies |
| `async` / `await` in the component | ✅ | ❌ (use `use()`, or a data library) |
| Database, filesystem, secrets, `process.env` | ✅ safe | ❌ never |
| `useState`, `useReducer`, `useEffect`, `useContext` | ❌ | ✅ |
| Event handlers (`onClick`, `onChange`) | ❌ | ✅ |
| Browser APIs (`window`, `localStorage`) | ❌ | ✅ (inside effects or handlers) |
| Good for | Data fetching, static content, layouts, large dependencies (markdown parsers, date libraries) | Buttons, forms, inputs, modals, carousels, anything stateful or using browser APIs |

```tsx
// app/products/[id]/page.tsx: a Server Component (no directive)
import { AddToCartButton } from './add-to-cart-button'
import { getProduct } from '@/lib/data'

export default async function ProductPage({ params }: PageProps<'/products/[id]'>) {
  const { id } = await params
  const product = await getProduct(id)      // direct DB/API call: no useEffect, no API route

  return (
    <article>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />   {/* the only interactive part */}
    </article>
  )
}
```

```tsx
// app/products/[id]/add-to-cart-button.tsx: a Client Component
'use client'
import { useState } from 'react'

export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false)
  return <button onClick={() => setAdded(true)}>{added ? 'Added ✓' : 'Add to cart'}</button>
}
```

---

## What "use client" really means

**`"use client"` marks a boundary, not a single component.**
- The file with the directive, **and every module it imports**, becomes part of the client bundle.
- You only need it at the **entry point** of a client subtree. Components imported by a Client Component are client automatically.
- **It does NOT mean "no server rendering".** Client Components are still rendered to HTML on the server for the first load, then hydrated.
- **`"use server"` is something else:** it marks **Server Functions** (Server Actions), not Server Components. Server Components have no directive.

**Common senior-level red flag:** putting `"use client"` on the **root layout** or a big page. That turns the whole tree into client code and throws away the benefits.

---

## Composition rules

**1. A Server Component can render a Client Component** and pass it **serialisable props**: strings, numbers, booleans, plain objects and arrays, `Date`, `Map`/`Set`, Promises, JSX, and **Server Actions**.
- **Not allowed:** regular functions (event handlers), class instances.

```tsx
<ClientChart data={rows} />                   // ✅ serialisable data
<ClientButton onClick={() => {}} />           // ❌ Functions cannot be passed directly to Client Components
<ClientForm action={saveProduct} />           // ✅ a Server Action is allowed
```

**2. A Client Component can't import a Server Component**, because the import would pull server code into the browser bundle. But it **can render Server Components passed as `children` or other props**:

```tsx
// ✅ the "donut" pattern: client wrapper, server content inside
// app/page.tsx (Server Component)
<Modal>                              {/* Client Component: open/close state */}
  <ProductDetails id="42" />         {/* Server Component: rendered on the server, passed as children */}
</Modal>
```

**3. Context providers are Client Components.** Create them in a `"use client"` file and wrap `{children}` in the root layout. The children can still be Server Components:

```tsx
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
// app/layout.tsx: <body><Providers>{children}</Providers></body>
```

**4. Server Components can't read React context.** Pass data as props, or use `React.cache` (request-scoped memoisation) to share values like the current user.

**5. Third-party components that use hooks but have no `"use client"`:** wrap them in your own `"use client"` file and re-export them.

---

## Passing data to the client

**Send only what the client needs.** Everything passed to a Client Component ends up in the HTML and the RSC payload, which anyone can read:

```tsx
const user = await db.user.findUnique({ where: { id } })   // includes passwordHash, email, phone…
return <ProfileCard user={user} />                          // ❌ the whole record is exposed to the browser
return <ProfileCard name={user.name} avatar={user.avatar} />  // ✅ minimal fields (a DTO)
```

**Streaming a Promise to the client with `use()`:** start fetching on the server, and let the Client Component suspend until the data arrives:

```tsx
// Server Component
const reviewsPromise = getReviews(id)            // not awaited: the page isn't blocked
return (
  <Suspense fallback={<p>Loading reviews…</p>}>
    <Reviews reviewsPromise={reviewsPromise} />
  </Suspense>
)

// Client Component
'use client'
import { use } from 'react'
export function Reviews({ reviewsPromise }: { reviewsPromise: Promise<Review[]> }) {
  const reviews = use(reviewsPromise)            // suspends until resolved
  return <ul>{reviews.map((r) => <li key={r.id}>{r.text}</li>)}</ul>
}
```

**Guarding modules:**
- `import 'server-only'` at the top of a module causes a **build error** if a Client Component imports it (database clients, secrets).
- `import 'client-only'` does the opposite.

**Environment variables:** only `NEXT_PUBLIC_*` variables are available in the browser, and they're **inlined at build time**. All others exist only on the server.

---

## Under the hood: the RSC payload

**How Server Components actually work:**

1. On the server, React renders Server Components into the **RSC payload**: a compact, streamable description of the UI tree. It contains the rendered output of Server Components, **placeholders with references** to Client Component JavaScript files, and the props passed to them.
2. Next.js uses the RSC payload and the Client Component code to render **HTML** for the first load. The user sees content immediately.
3. In the browser, the **RSC payload reconciles** the server and client trees, and React **hydrates** the Client Components (attaches event handlers and state).
4. On later **client navigations**, Next.js fetches **only the RSC payload** for the new route segments. There's no full HTML reload, and client state in shared layouts is preserved.

**Server Components vs SSR (a common confusion):**
- **SSR** is about **when and where HTML is generated** (on the server, per request).
- **Server Components** are about **which components never ship JavaScript and never hydrate**.
- **Client Components are also SSR'd.** Server Components can be rendered at build time (static) or at request time. They're complementary.

---

## Hydration errors

**Hydration error = the first client render doesn't match the server HTML.** React then throws away the server HTML and re-renders on the client (slower, with a visible flicker), and logs *"Hydration failed because the server rendered HTML didn't match the client"*.

| Cause | Fix |
|---|---|
| Time, random values or locale formatting in render (`Date.now()`, `Math.random()`, `toLocaleString()`) | Compute in `useEffect`, or render on the server only and pass it as a prop; `suppressHydrationWarning` for unavoidable text like timestamps |
| `typeof window !== 'undefined'` branches in render | Render the same thing first, then update in `useEffect` (a "mounted" flag) |
| Reading `localStorage` / `window.innerWidth` during render | Read it in an effect, or use CSS media queries |
| Invalid HTML nesting (`<p><div/></p>`, `<a>` inside `<a>`, `<tr>` without `<tbody>`) | Fix the markup: the browser "repairs" it differently from React |
| Browser extensions changing the DOM | `suppressHydrationWarning` on `<html>`/`<body>` for theme or extension attributes |
| Client-only libraries | `next/dynamic` with `{ ssr: false }`, **inside a Client Component** (not allowed in Server Components) |

---

## Interview Q&A

**Q: What are Server Components?**
Components that run only on the server, can be async and access data or secrets directly, and send no JavaScript to the client. They're the default in the App Router.

**Q: When do you use `"use client"`?**
When a component needs state, effects, event handlers, browser APIs or client-only libraries. I put it on the smallest interactive leaf, not on layouts or whole pages.

**Q: Can a Client Component render a Server Component?**
It can't import one, but it can render Server Components passed as `children` or other props, since they're rendered on the server first.

**Q: Are Client Components rendered on the server?**
Yes, for the initial HTML. Then they hydrate in the browser. "use client" means "this ships JavaScript and hydrates", not "client-side rendering only".

**Q: Does `"use client"` leak secrets?**
Any code and props in a Client Component reach the browser. Secrets stay safe in Server Components, Server Actions and Route Handlers. Use `server-only`, and only `NEXT_PUBLIC_` env vars are exposed.

**Q: What is the RSC payload?**
A serialised, streamable representation of the rendered Server Component tree with references to Client Components and their props. It's used to build the HTML, reconcile and hydrate, and for client navigations without full reloads.

---

## 🎯 Interview answer

> "In the App Router, components are Server Components by default: they run only on the server, can be async and read data or secrets directly, and ship no JavaScript. `use client` marks a boundary where client code begins: that module and its imports go into the bundle, are still server-rendered for the first HTML, and then hydrate, so I put it on small interactive leaves like buttons, forms and modals, never on the root layout. Server Components can pass serialisable props, including promises and Server Actions, but not plain functions, to Client Components. Client Components can't import Server Components, but they can render them passed as children, which is how providers and client wrappers work. Under the hood, React produces an RSC payload that's used to build the HTML, hydrate client parts, and power client navigations that only fetch changed segments. On security, I pass minimal DTOs rather than full database records, guard server modules with `server-only`, and remember that only `NEXT_PUBLIC_` variables reach the browser. For hydration mismatches I avoid time, random or browser-only values during render, fix invalid HTML nesting, and move client-only logic into effects or `next/dynamic` with `ssr: false` inside a Client Component."
