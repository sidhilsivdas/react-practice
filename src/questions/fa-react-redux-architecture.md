## Short answer

**A production React + Redux app should be organised by feature, with clear layers and rules about who can import what.**

The modern stack:

| Concern | Tool |
|---|---|
| **Build** | Vite + React + TypeScript |
| **Global client state** | **Redux Toolkit 2** (`configureStore`, `createSlice`, `combineSlices`) |
| **Server data** (API calls, caching) | **RTK Query** (`createApi`, `injectEndpoints`), part of Redux Toolkit |
| **Side effects** (react to actions) | **Listener middleware** (`createListenerMiddleware`) |
| **Routing** | React Router (lazy routes, protected routes) |
| **Forms** | React Hook Form + zod |
| **Testing** | Vitest + Testing Library + MSW; Playwright for E2E |

**The golden rule of state:**

- **Server data → RTK Query.**
- **Shared client state → Redux slices.**
- **URL state → the router.**
- **Everything else → local `useState`.**

**Don't put everything in Redux.**

**Analogy: a department store** 🏬 Each department (feature) has its own staff, stock and tills. Shared services (lifts, security, payments) are in the central core (`app/` and `shared/`). Departments never reach into each other's stockrooms; they go through the front counter (each feature's public `index.ts`).

---

## Folder structure

```
src/
├── app/                          ← app-wide wiring (imports features, never imported BY features)
│   ├── store.ts                  configureStore, root reducer, middleware
│   ├── hooks.ts                  useAppDispatch / useAppSelector (typed)
│   ├── providers.tsx             <Provider>, <RouterProvider>, theme, error boundary
│   ├── router.tsx                routes (lazy-loaded pages), ProtectedRoute
│   └── listeners.ts              app-level side effects (listener middleware)
│
├── pages/                        ← route-level screens: thin, compose features
│   ├── HomePage.tsx
│   ├── ProductPage.tsx
│   └── CheckoutPage.tsx
│
├── features/                     ← ⭐ business features (most code lives here)
│   ├── auth/
│   │   ├── api/authApi.ts        RTK Query endpoints (injectEndpoints)
│   │   ├── model/authSlice.ts    slice + selectors
│   │   ├── components/LoginForm.tsx
│   │   ├── hooks/useAuth.ts
│   │   ├── types.ts
│   │   ├── __tests__/
│   │   └── index.ts              ⭐ public API: the only file other code imports
│   ├── cart/
│   │   ├── api/cartApi.ts
│   │   ├── model/cartSlice.ts
│   │   ├── model/cartListeners.ts
│   │   ├── components/CartDrawer.tsx, CartItem.tsx
│   │   └── index.ts
│   ├── products/
│   └── checkout/
│
├── shared/                       ← reusable, NO business logic, imports nothing from features
│   ├── api/baseApi.ts            createApi + baseQuery (auth headers, refresh, errors)
│   ├── ui/                       design system: Button, Modal, Input, Spinner
│   ├── lib/                      formatPrice, dates, storage, analytics
│   ├── hooks/                    useDebounce, useMediaQuery
│   ├── config/env.ts             typed, validated environment variables
│   └── types/
│
├── assets/                       images, fonts, icons
├── styles/                       global CSS, tokens
├── test/                         test utils (renderWithProviders), MSW handlers, setup
└── main.tsx                      entry point
```

### Dependency rules ⭐

```
pages ──▶ features ──▶ shared
  │          │
  └──▶ app ──┘        app wires everything together
```

| Rule | Why |
|---|---|
| `shared` imports **nothing** from `features`, `pages` or `app` | Stays reusable and generic |
| A feature imports another feature **only via its `index.ts`** | Internals can change freely |
| Features never import from `pages` or `app` (except the typed hooks and types) | No circular dependencies |
| `pages` compose features; they don't contain business logic | Routes stay thin |

**Enforce the rules with a tool, not just a wiki page:** `eslint-plugin-boundaries`, `import/no-restricted-paths`, or Nx module boundaries.

> This layering follows the same idea as **Feature-Sliced Design (FSD)** (app → pages → widgets → features → entities → shared), a popular methodology for large React apps. Use the full FSD if the app is very large; the simpler version above suits most teams.

---

## The store

```ts
// src/app/store.ts
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { baseApi } from '@/shared/api/baseApi'
import { authSlice } from '@/features/auth'
import { cartSlice } from '@/features/cart'
import { listenerMiddleware } from './listeners'

// combineSlices (RTK 2): builds the root reducer from slices, and allows lazy injection later
export const rootReducer = combineSlices(baseApi, authSlice, cartSlice)

export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,                                  // used by tests and SSR
    middleware: (getDefault) =>
      getDefault()
        .prepend(listenerMiddleware.middleware)      // side effects
        .concat(baseApi.middleware),                 // RTK Query caching, polling, invalidation
    devTools: import.meta.env.DEV,                   // Redux DevTools only in development
  })
  setupListeners(store.dispatch)                     // refetch on window focus / reconnect
  return store
}

export const store = makeStore()

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
```

```ts
// src/app/hooks.ts: use these everywhere instead of plain useDispatch / useSelector
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

**`makeStore()` instead of only a singleton** means each test (or server request) gets a fresh store.

---

## A feature slice

**Client state only:** the cart drawer UI and an optimistic item count. Cart **data** comes from RTK Query.

```ts
// src/features/cart/model/cartSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type CartUiState = {
  isDrawerOpen: boolean
  lastAddedSku: string | null
}

const initialState: CartUiState = { isDrawerOpen: false, lastAddedSku: null }

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    drawerOpened(state) {
      state.isDrawerOpen = true                    // Immer: "mutating" code is safe here
    },
    drawerClosed(state) {
      state.isDrawerOpen = false
    },
    itemAdded(state, action: PayloadAction<{ sku: string }>) {
      state.lastAddedSku = action.payload.sku
    },
  },
  selectors: {                                     // RTK 2: selectors defined on the slice
    selectIsDrawerOpen: (state) => state.isDrawerOpen,
    selectLastAddedSku: (state) => state.lastAddedSku,
  },
})

export const { drawerOpened, drawerClosed, itemAdded } = cartSlice.actions
export const { selectIsDrawerOpen, selectLastAddedSku } = cartSlice.selectors
```

```ts
// src/features/cart/index.ts: the feature's public API
export { cartSlice, drawerOpened, drawerClosed, selectIsDrawerOpen } from './model/cartSlice'
export { useGetCartQuery, useAddToCartMutation } from './api/cartApi'
export { CartDrawer } from './components/CartDrawer'
```

**Naming conventions:**

- **Actions describe events in the past tense** (`itemAdded`, `drawerOpened`), not setters (`setItems`), as the Redux style guide recommends.
- **Selectors start with `select`.**

---

## RTK Query for server data

**One base API**, and each feature **injects** its own endpoints, so code stays in its feature and can be code-split:

```ts
// src/shared/api/baseApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithReauth } from './baseQueryWithReauth'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Cart', 'Product', 'Order', 'User'],   // used for cache invalidation
  endpoints: () => ({}),                             // features inject their own
})
```

```ts
// src/features/cart/api/cartApi.ts
import { baseApi } from '@/shared/api/baseApi'
import type { Cart, AddToCartInput } from '../types'

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query<Cart, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: build.mutation<Cart, AddToCartInput>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      invalidatesTags: ['Cart'],                     // → getCart refetches automatically
    }),
  }),
})

export const { useGetCartQuery, useAddToCartMutation } = cartApi
```

```tsx
// in a component: loading, error, caching, deduplication handled for you
function CartBadge() {
  const { data: cart, isLoading } = useGetCartQuery()
  if (isLoading) return <Spinner size="sm" />
  return <span aria-label={`Cart, ${cart?.items.length ?? 0} items`}>{cart?.items.length ?? 0}</span>
}
```

**Why RTK Query instead of thunks with `useEffect`:**

- **Caching and request deduplication.**
- **Loading and error state.**
- **Automatic refetching after mutations** (tags).
- **Polling.**
- **Optimistic updates.**
- **Far less code.**

---

## Auth & token refresh

**Handle 401s in one place.** A mutex makes sure that if 5 requests fail at once, only **one** refresh call happens:

```ts
// src/shared/api/baseQueryWithReauth.ts
import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Mutex } from 'async-mutex'
import { env } from '@/shared/config/env'

const mutex = new Mutex()

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.VITE_API_URL,
  credentials: 'include',                            // send the HttpOnly refresh cookie
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { accessToken: string | null } }).auth.accessToken
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  await mutex.waitForUnlock()                        // wait if another request is refreshing
  let result = await rawBaseQuery(args, api, extra)

  if (result.error?.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire()
      try {
        const refresh = await rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extra)
        if (refresh.data) {
          api.dispatch({ type: 'auth/tokenRefreshed', payload: refresh.data })
          result = await rawBaseQuery(args, api, extra)           // retry the original request
        } else {
          api.dispatch({ type: 'auth/loggedOut' })                // refresh failed → log out
        }
      } finally {
        release()
      }
    } else {
      await mutex.waitForUnlock()
      result = await rawBaseQuery(args, api, extra)
    }
  }
  return result
}
```

**The access token lives in Redux memory, not localStorage. The refresh token is an HttpOnly cookie.** (See the React & JavaScript **Auth flow** question.)

---

## Side effects: listeners

**React to actions outside components**, instead of chaining effects:

```ts
// src/app/listeners.ts
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from './store'
import { cartApi } from '@/features/cart/api/cartApi'
import { drawerOpened, itemAdded } from '@/features/cart/model/cartSlice'

export const listenerMiddleware = createListenerMiddleware()
export const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>()

// when add-to-cart succeeds: open the mini cart and send an analytics event
startAppListening({
  matcher: cartApi.endpoints.addToCart.matchFulfilled,
  effect: (action, listenerApi) => {
    listenerApi.dispatch(itemAdded({ sku: action.meta.arg.originalArgs.sku }))
    listenerApi.dispatch(drawerOpened())
    analytics.track('add_to_cart', { sku: action.meta.arg.originalArgs.sku })
  },
})

// log every failed API call in one place
startAppListening({
  predicate: (action) => action.type.endsWith('/rejected'),
  effect: (action) => errorTracker.capture(action),
})
```

---

## Routing & code splitting

```tsx
// src/app/router.tsx
import { createBrowserRouter } from 'react-router'
import { lazy } from 'react'
import { AppLayout } from './AppLayout'
import { ProtectedRoute } from '@/features/auth'

const HomePage = lazy(() => import('@/pages/HomePage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))

export const router = createBrowserRouter([
  {
    element: <AppLayout />,                        // header, footer, <Suspense> around <Outlet />
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/products/:slug', element: <ProductPage /> },
      {
        element: <ProtectedRoute />,               // redirects to /login if not authenticated
        children: [{ path: '/checkout', element: <CheckoutPage /> }],
      },
    ],
  },
])
```

**Lazy-loading a feature's reducer** with RTK 2 (only for big features loaded on demand):

```ts
// store.ts
export const rootReducer = combineSlices(baseApi, authSlice, cartSlice).withLazyLoadedSlices<LazyLoadedSlices>()

// features/admin/model/adminSlice.ts
declare module '@/app/store' {
  export interface LazyLoadedSlices extends WithSlice<typeof adminSlice> {}
}
const injected = adminSlice.injectInto(rootReducer)   // added when this file is first imported
```

---

## Providers & entry

```tsx
// src/app/providers.tsx
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { store } from './store'
import { router } from './router'

export function AppProviders() {
  return (
    <ErrorBoundary FallbackComponent={AppCrashScreen}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </ErrorBoundary>
  )
}
```

```ts
// src/shared/config/env.ts: fail fast if config is missing (VITE_ vars are public!)
import { z } from 'zod'

const schema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_SENTRY_DSN: z.string().optional(),
})
export const env = schema.parse(import.meta.env)
```

---

## Testing setup

```tsx
// src/test/renderWithProviders.tsx: a fresh store per test, with optional preloaded state
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore, type RootState } from '@/app/store'

export function renderWithProviders(ui: React.ReactElement, preloadedState?: Partial<RootState>) {
  const store = makeStore(preloadedState)
  return { store, ...render(<Provider store={store}>{ui}</Provider>) }
}
```

```tsx
// features/cart/__tests__/CartDrawer.test.tsx
test('shows the cart items', async () => {
  // MSW returns the fake /cart response
  renderWithProviders(<CartDrawer />, { cart: { isDrawerOpen: true, lastAddedSku: null } })
  expect(await screen.findByRole('listitem', { name: /trail runner/i })).toBeInTheDocument()
})
```

| Test type | What | Tool |
|---|---|---|
| Unit | reducers, selectors, utils (pure functions) | Vitest |
| Integration | components + real store + **MSW**-mocked API | Testing Library |
| E2E | critical journeys | Playwright |

**Test behaviour through the UI**, rather than testing that "action X was dispatched".

---

## What goes where

| Data | Put it in | Not in |
|---|---|---|
| Products, cart, orders, user profile from the API | **RTK Query** cache | ❌ copied into a slice |
| Auth token, current user ID | **auth slice** | ❌ localStorage (XSS risk) |
| Cart drawer open, global modals, theme, toasts | **UI slices** | |
| Filters, sort, page, search query | **URL** (`useSearchParams`) | ❌ Redux (breaks sharing and the back button) |
| Form inputs | **React Hook Form / local state** | ❌ Redux (re-renders on every keystroke) |
| Hover, open/closed for one component | **`useState`** | ❌ Redux |

---

## Production checklist

- ✅ **TypeScript strict**; typed hooks (`useAppSelector`, `useAppDispatch`).
- ✅ **Feature folders with a public `index.ts`**, and lint-enforced import boundaries.
- ✅ **RTK Query for all server data**, with tags for invalidation and one `baseQuery` for auth, refresh and errors.
- ✅ **Slices only for real client state**, with past-tense event names and selectors on the slice.
- ✅ **Memoised selectors** (`createSelector`) for derived data; don't create new objects inside `useSelector`.
- ✅ **Listener middleware** for cross-feature side effects, analytics and error logging.
- ✅ **Lazy routes** (`React.lazy`); lazy slices or endpoints for big, rarely used features.
- ✅ **Validated env config**; no secrets in `VITE_` variables.
- ✅ **Error boundaries** (app plus per-route), and **Sentry** for errors.
- ✅ **`makeStore()` + `renderWithProviders`** for tests, with **MSW** for the API.
- ✅ **Redux DevTools in development only**; don't put non-serialisable values (class instances, promises) in state.
- ✅ **Performance:** keep slices normalised (`createEntityAdapter`) for large lists; split components so each subscribes only to what it needs.

---

## Quick Q&A

**Q: How do you structure a large React + Redux app?**
By feature: each feature owns its slice, RTK Query endpoints, components, hooks and tests, behind a public `index.ts`. Plus `app/` for store and routing wiring, `pages/` for thin route screens, and `shared/` for the design system and utilities, with lint-enforced import rules.

**Q: Redux slice or RTK Query?**
RTK Query for anything that comes from the server (caching, refetching, invalidation); slices for client-only state like UI flags or the auth token.

**Q: How do you avoid one giant `api.ts`?**
A single `baseApi` with `injectEndpoints` in each feature, which also enables code splitting.

**Q: Where do side effects go?**
RTK Query handles data fetching; the listener middleware handles reactions to actions (analytics, opening a drawer after add-to-cart, logging failures).

**Q: How do you handle token refresh?**
A custom `baseQuery` that catches 401s, refreshes once behind a mutex, retries the original request, and logs out if the refresh fails.

**Q: How do you test Redux code?**
Mostly through components rendered with a real store (`makeStore`) and MSW-mocked APIs; unit tests for complex reducers and selectors; Playwright for E2E.

---

## 🎯 Interview answer

> "I organise a production React and Redux app by feature, not by file type. `app/` holds the wiring (`store.ts` with `configureStore` and `combineSlices`, typed hooks using `useSelector.withTypes` and `useDispatch.withTypes`, providers, the router with lazy-loaded pages, and app-level listeners). `pages/` are thin route screens. `features/` like auth, cart and checkout each own their RTK Query endpoints, slice with selectors, components, hooks, types and tests, and expose only a public `index.ts`. `shared/` holds the design system, utilities, validated env config and the base API, and never imports from features. Those dependency rules are enforced with ESLint boundaries. For state, RTK Query owns all server data: a single `baseApi` with a custom `baseQuery` that adds the token and handles 401 refresh behind a mutex, and features inject their own endpoints with tags for cache invalidation. Slices are only for genuine client state like auth or UI flags, with past-tense event names. Filters live in the URL and form state stays local. Cross-feature side effects like analytics or opening the mini-cart go in the listener middleware. For testing, `makeStore` gives each test a fresh store, rendered through `renderWithProviders` with MSW mocking the API, and Playwright covers the critical journeys."
