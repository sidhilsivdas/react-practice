## Short answer

**Redux is one global store for app state that many components share.** Any component can **read** from it, and any component can **request a change** to it. Changes follow **one strict path**, so updates are **predictable** and easy to debug.

**Analogy: a bank** 🏦

- **Store** = the **bank vault**, where all the money (state) lives.
- **Action** = a **deposit slip**: `{ type: 'deposit', amount: 100 }`. It describes **what you want**.
- **Dispatch** = **handing the slip to the cashier.**
- **Reducer** = the **cashier**, who follows fixed rules to update the balance. You can't touch the vault yourself.
- **Selector** = **checking your balance.**

### The flow (one direction only)

```
   ┌─────────────┐  dispatch(action)   ┌──────────┐
   │  Component  │ ──────────────────▶ │  Store   │
   │ (click Add) │                     │          │
   └──────▲──────┘                     │ reducer( │
          │                            │  state,  │
          │ useSelector → new value    │  action) │
          │ → re-render                │ = new    │
          └─────────────────────────── │  state   │
                                       └──────────┘
```

1. **The user clicks "Add to cart".**
2. **The component calls `dispatch(addItem(product))`.**
3. **The store runs the reducer**, which returns **new state**.
4. **Components using `useSelector` get the new value**, and only those whose selected data changed re-render.
5. **The UI updates.** The header badge goes from 2 to 3.

---

## Why Redux

### Problem: shared state and prop drilling

```
App (cart state lives here)
 ├── Header        → needs cart COUNT 🛒 3
 │    └── Nav
 │         └── CartIcon      ← pass cart through 3 levels 😩
 └── ProductPage   → needs addToCart
      └── ProductList
           └── ProductCard   ← pass addToCart through 3 levels 😩
```

**With Redux:** `CartIcon` and `ProductCard` both **connect straight to the store**. There are no props in between.

### When to use it

| ✅ Use Redux | ❌ Don't need Redux |
|---|---|
| Many distant components share the same state (cart, logged-in user, notifications) | Small app, or state used by one component (`useState`) |
| Complex update logic | Form input values (keep them local) |
| You want to debug **what changed and why** (Redux DevTools, time travel) | State that rarely changes, like theme or language (**Context** is enough) |
| Big team, so you want **one consistent pattern** | Server data only (**RTK Query** or **TanStack Query** is better) |

---

## Why Redux Toolkit

**Old ("classic") Redux worked, but it was painful.** Redux Toolkit (RTK) is now the **official, recommended way** to write Redux.

**❌ Classic Redux, with lots of boilerplate:**

```js
// action type constant
const ADD_ITEM = 'cart/addItem'

// action creator
const addItem = (product) => ({ type: ADD_ITEM, payload: product })

// reducer: switch statement + manual immutable copying
function cartReducer(state = { items: [] }, action) {
  switch (action.type) {
    case ADD_ITEM: {
      const exists = state.items.find((i) => i.id === action.payload.id)
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] }
    }
    default:
      return state
  }
}

// store setup: combine reducers + middleware + devtools by hand
const store = createStore(
  combineReducers({ cart: cartReducer }),
  composeWithDevTools(applyMiddleware(thunk))
)
```

**✅ Redux Toolkit, doing the same thing:**

```js
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      const exists = state.items.find((i) => i.id === action.payload.id)
      if (exists) exists.quantity++                          // "mutating" is OK here!
      else state.items.push({ ...action.payload, quantity: 1 })
    },
  },
})

export const { addItem } = cartSlice.actions                 // action creators generated for you

const store = configureStore({ reducer: { cart: cartSlice.reducer } })   // devtools + thunk built in
```

### What RTK fixes

| Problem in classic Redux | RTK solution |
|---|---|
| Separate files for action types, action creators and reducers | **`createSlice`** generates actions and the reducer together |
| Deeply nested `...spread` copying | **Immer** lets you write `state.items.push(x)`, and it produces a new immutable state for you |
| Accidentally mutating state, a silent bug | Immer handles it, plus **built-in checks** in development |
| Manual store setup (DevTools, thunk, `combineReducers`) | **`configureStore`** does it in one line |
| Writing loading/error logic for every API call | **`createAsyncThunk`** gives you `pending`, `fulfilled` and `rejected` |
| Caching API data by hand | **RTK Query** handles fetching, caching and refetching |

> `createStore` from classic Redux is now **deprecated**. New projects should use `configureStore`.

---

## Step by step: cart

### Step 1: Install

```bash
npm install @reduxjs/toolkit react-redux
```

### Step 2: Create a slice (`cartSlice.js`)

A **slice** is one feature's **state + reducers + actions**.

```js
import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      const item = state.items.find((i) => i.id === action.payload.id)
      if (item) item.quantity++
      else state.items.push({ ...action.payload, quantity: 1 })
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload)
    },
    clearCart(state) {
      state.items = []
    },
  },
})

export const { addItem, removeItem, clearCart } = cartSlice.actions
export default cartSlice.reducer

// selectors: how components read state
export const selectCartItems = (state) => state.cart.items
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0)
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
```

**`addItem` automatically creates:** `addItem(product)` → `{ type: 'cart/addItem', payload: product }`

### Step 3: Create the store (`store.js`)

```js
import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './cartSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,          // state.cart
  },
})
```

### Step 4: Provide the store to the app (`main.jsx`)

```jsx
import { Provider } from 'react-redux'
import { store } from './store'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
)
```

### Step 5: Update the UI: dispatch actions

```jsx
import { useDispatch } from 'react-redux'
import { addItem } from './cartSlice'

function ProductCard({ product }) {
  const dispatch = useDispatch()

  return (
    <div>
      <h3>{product.name}</h3>
      <p>₹{product.price}</p>
      <button onClick={() => dispatch(addItem(product))}>Add to cart</button>
    </div>
  )
}
```

### Step 6: Read state with selectors

```jsx
import { useSelector } from 'react-redux'
import { selectCartCount } from './cartSlice'

function CartIcon() {
  const count = useSelector(selectCartCount)
  return <span>🛒 {count}</span>          // updates automatically when the cart changes
}
```

```jsx
import { useDispatch, useSelector } from 'react-redux'
import { removeItem, clearCart, selectCartItems, selectCartTotal } from './cartSlice'

function CartPage() {
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)
  const dispatch = useDispatch()

  if (items.length === 0) return <p>Your cart is empty</p>

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          {item.name} × {item.quantity}
          <button onClick={() => dispatch(removeItem(item.id))}>Remove</button>
        </div>
      ))}
      <h3>Total: ₹{total}</h3>
      <button onClick={() => dispatch(clearCart())}>Clear cart</button>
    </div>
  )
}
```

### What happens when you click "Add to cart"

```
1. ProductCard: dispatch(addItem({ id: 1, name: 'Phone', price: 500 }))
2. Store runs cartSlice reducer → items: [{ id: 1, ..., quantity: 1 }]  (new state)
3. useSelector in CartIcon:  count was 0 → now 1  → re-render → 🛒 1
4. useSelector in CartPage:  items changed        → re-render → shows Phone
5. Components whose selected value DIDN'T change → no re-render
```

**`CartIcon` (in the header) and `ProductCard` (deep in the page) never pass props to each other.** They both talk to the store.

---

## Async with thunks

**`createAsyncThunk`:** loading, error and data in the UI.

```js
// productsSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

export const fetchProducts = createAsyncThunk('products/fetch', async () => {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()                                 // becomes action.payload
})

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export default productsSlice.reducer
```

```jsx
function ProductList() {
  const dispatch = useDispatch()
  const { items, status, error } = useSelector((state) => state.products)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchProducts())
  }, [status, dispatch])

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'failed') return <p>Error: {error}</p>
  return items.map((p) => <ProductCard key={p.id} product={p} />)
}
```

**`reducers` vs `extraReducers`:** `reducers` are for **this slice's own** actions; `extraReducers` respond to actions defined **elsewhere**, like thunks or another slice.

### Bonus: RTK Query (the modern way to fetch server data)

```js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getProducts: builder.query({ query: () => 'products' }),
  }),
})

export const { useGetProductsQuery } = api

// In a component: loading, error, caching and refetching handled for you
const { data, isLoading, error } = useGetProductsQuery()
```

(Add `api.reducer` and `api.middleware` to `configureStore`.)

---

## UI update use cases

| Use case | Action dispatched | UI that updates |
|---|---|---|
| 🛒 Add to cart | `addItem(product)` | Header badge, cart page, total |
| 🔐 Login / logout | `setUser(user)` / `logout()` | Navbar avatar, protected pages, menus |
| 🔔 Notifications | `addNotification(msg)` | Toast popup, bell count |
| 🌙 Theme toggle | `toggleTheme()` | Whole app's colours |
| 🔍 Filters | `setFilter({ category: 'phones' })` | Product list, filter chips, result count |
| ⏳ Loading data | `fetchProducts()` | Spinner, then list or error message |
| ❤️ Wishlist | `toggleWishlist(id)` | Heart icons everywhere that product appears |

---

## Quick Q&A

**Q: What are Redux's three principles?**
1. **Single source of truth:** the whole app state lives in one store.
2. **State is read-only:** the only way to change it is to dispatch an action.
3. **Changes are made with pure functions:** reducers take `(state, action)` and return new state.

**Q: What is a reducer? Why must it be pure?**
A function `(state, action) => newState`. **Pure** means the same input always gives the same output, with no side effects (no API calls, no `Math.random()`). That makes updates **predictable, testable**, and enables **time-travel debugging**.

**Q: Why immutability?**
React-Redux detects changes by **reference** (`===`). If you mutate the same object, the reference doesn't change and **the UI doesn't update**. (RTK's Immer creates new objects for you.)

**Q: Can I mutate state in `createSlice`?**
**Yes, but only inside RTK reducers.** Immer gives you a **draft** (a proxy), records your changes, and produces a new immutable state. Either mutate the draft **or** return new state, never both.

**Q: Redux vs Context API?**

| | Context | Redux |
|---|---|---|
| Purpose | **Pass** values down without props | **Manage** complex global state |
| Re-renders | **All consumers** re-render when the value changes | **Only components whose selected slice changed** |
| DevTools / time travel | ❌ | ✅ |
| Middleware (async, logging) | ❌ | ✅ |
| Best for | theme, language, logged-in user | large apps with frequent shared updates |

**Q: What is middleware?**
Code that runs **between dispatching an action and the reducer**, used for async logic, logging and analytics. **Redux Thunk** (built into RTK) lets you dispatch **functions** for async work.

```js
const logger = (store) => (next) => (action) => {
  console.log('dispatching', action)
  return next(action)               // pass it on to the reducer
}
```

**Q: Thunk vs Saga?**
**Thunk:** simple async functions, built into RTK, and enough for most apps. **Saga:** generator functions, powerful for complex flows like cancellation and races, but more to learn.

**Q: When does `useSelector` re-render a component?**
When the value it returns **changes by reference** (`===`).

```js
// ❌ New object every time → re-renders on EVERY store update
const data = useSelector((state) => ({ count: state.cart.items.length }))

// ✅ Return primitives, or use separate selectors
const count = useSelector((state) => state.cart.items.length)
```

For derived data, use **`createSelector`** (memoized), so it recalculates only when its inputs change.

**Q: `createAsyncThunk` vs RTK Query?**
**`createAsyncThunk`:** you write the loading, error and data handling yourself. **RTK Query:** a full data-fetching layer with **caching, deduplication, refetching** and generated hooks; preferred for server data.

**Q: What is normalized state?**
Storing items **by ID** instead of nested arrays, `{ ids: [1, 2], entities: { 1: {...}, 2: {...} } }`, so updates and lookups are fast and data isn't duplicated. RTK's **`createEntityAdapter`** helps with this.

**Q: Should everything go in Redux?**
**No.** Form inputs, modal open/close and hover state stay in **`useState`**. Server data is best in **RTK Query** or **TanStack Query**. Put only **shared client state** in Redux.

**Q: Redux vs Zustand?**
Zustand is a smaller, simpler store with less structure. Redux (with RTK) gives a **stricter pattern, DevTools and middleware**, which helps big teams.

---

## 🎯 Interview answer

> "Redux is a predictable state container: the app's shared state lives in a single store, components read it with `useSelector`, and the only way to change it is to dispatch an action, which a pure reducer handles by returning new state. Data flows one way, so updates are easy to trace and debug with DevTools. It solves prop drilling and keeps distant components in sync, for example a product card dispatches `addItem` and the header's cart badge updates instantly without passing props. Classic Redux had a lot of boilerplate: action type constants, action creators, switch reducers, manual immutable spreading and manual store setup. Redux Toolkit is the official solution. `createSlice` generates actions and reducers together and uses Immer, so I can write simple 'mutating' code safely, `configureStore` sets up DevTools and thunk automatically, `createAsyncThunk` handles pending, fulfilled and rejected states for API calls, and RTK Query adds caching and data fetching. I keep local UI state in `useState`, put server data in RTK Query, and use Redux only for truly shared client state."
