## What the JD says

> "Build **scalable, maintainable UI solutions using modern React patterns**"

---

## What it means

**Patterns are reusable ways of structuring components and logic** so code stays easy to change as the app and team grow. "Modern" means **hooks, composition, server components and React 19 features**, not class-based HOC/render-prop-heavy code.

**What a maintainable component library looks like:**

- **Small, focused components** (one job each).
- **Logic in custom hooks**, separate from the UI.
- **Composition over configuration**, instead of 30 boolean props.
- **Predictable state** (the right state in the right place).
- **Accessible and typed by default.**

**Analogy: LEGO** 🧱 Good components are small, standard bricks that snap together in many ways. Bad components are one giant moulded piece that only fits one model.

---

## Composition

**Pass components as `children` (or as props) instead of adding flags:**

```tsx
// ❌ Configuration explosion
<Card title="Shoes" showImage imagePosition="left" showButton buttonText="Buy" buttonVariant="primary" />

// ✅ Composition: flexible, readable, no new props for every variation
<Card>
  <Card.Image src={img} alt="" />
  <Card.Body>
    <h3>Shoes</h3>
    <Button variant="primary">Buy</Button>
  </Card.Body>
</Card>
```

**Composition also fixes prop drilling** (pass the finished element down) and lets **server components be passed into client components** as children.

---

## Compound components

**Components that work together and share state implicitly** (like `<select>` and `<option>`):

```tsx
const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null)

function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultTab)
  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>   // React 19 provider syntax
}

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs.* must be used inside <Tabs>')
  return ctx
}

Tabs.List = function List({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>
}

Tabs.Tab = function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { active, setActive } = useTabs()
  return (
    <button role="tab" aria-selected={active === id} aria-controls={`panel-${id}`} onClick={() => setActive(id)}>
      {children}
    </button>
  )
}

Tabs.Panel = function Panel({ id, children }: { id: string; children: React.ReactNode }) {
  const { active } = useTabs()
  return active === id ? <div role="tabpanel" id={`panel-${id}`}>{children}</div> : null
}

// Usage: flexible layout, no prop drilling
<Tabs defaultTab="details">
  <Tabs.List>
    <Tabs.Tab id="details">Details</Tabs.Tab>
    <Tabs.Tab id="reviews">Reviews</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="details">…</Tabs.Panel>
  <Tabs.Panel id="reviews">…</Tabs.Panel>
</Tabs>
```

**Used by:** design systems, Radix UI, Headless UI, React Aria.

---

## Custom hooks

**Move logic out of components so it's reusable and testable**, and the component only describes the UI:

```tsx
function useProductVariants(product: Product) {
  const [selected, setSelected] = useState<Record<string, string>>({})   // { size: 'M', color: 'red' }

  const variant = useMemo(
    () => product.variants.find((v) => Object.entries(selected).every(([k, val]) => v.attributes[k] === val)),
    [product.variants, selected]
  )

  const select = (attribute: string, value: string) => setSelected((s) => ({ ...s, [attribute]: value }))

  return { selected, select, variant, isAvailable: !!variant?.inStock }
}

function VariantPicker({ product }: { product: Product }) {
  const { selected, select, variant, isAvailable } = useProductVariants(product)
  // ...only rendering here
}
```

**"Managing complex side effects in custom hooks"** (a reported Accenture question):

- **One effect per concern.**
- **Correct dependencies.**
- **Always clean up:** abort fetches, clear timers, unsubscribe.
- **Avoid race conditions** with `AbortController`.
- **Use `useEffectEvent`** (React 19.2) for "latest value" callbacks.
- **Move data fetching out of effects** into server components or TanStack Query.

(See the **Custom hooks** and **useState & useEffect** questions.)

---

## Container / presentational

**Separate "getting data" from "showing data":**

```tsx
// server component: data
export default async function ProductReviews({ productId }: { productId: string }) {
  const reviews = await getReviews(productId)
  return <ReviewList reviews={reviews} />
}

// presentational: pure UI, easy to test and show in Storybook
function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return <p>No reviews yet.</p>
  return <ul>{reviews.map((r) => <ReviewItem key={r.id} review={r} />)}</ul>
}
```

**With server components this pattern comes naturally:** server components fetch, and client or presentational components render.

---

## State patterns

| Pattern | When |
|---|---|
| **Colocation** | Keep state in the lowest component that needs it |
| **Lifting state up** | Siblings share it |
| **`useReducer`** | Complex state with many transitions (multi-step checkout, filters) |
| **State machines** (XState or a reducer) | Flows with clear states: `idle → submitting → success/error` |
| **URL as state** | Filters, sort, pagination, tabs |
| **Server state library** | Remote data (TanStack Query): caching, retries, invalidation |
| **Derived state** | Compute during render, don't store duplicates |
| **Optimistic updates** | `useOptimistic` for add-to-cart and likes |

```tsx
type CheckoutState =
  | { step: 'address' }
  | { step: 'payment'; address: Address }
  | { step: 'review'; address: Address; payment: PaymentMethod }
  | { step: 'done'; orderId: string }

function reducer(state: CheckoutState, action: Action): CheckoutState {
  switch (action.type) {
    case 'SET_ADDRESS': return { step: 'payment', address: action.address }
    case 'SET_PAYMENT': return state.step === 'payment' ? { ...state, step: 'review', payment: action.payment } : state
    case 'PLACED':      return { step: 'done', orderId: action.orderId }
    default:            return state
  }
}
// impossible states (paying without an address) can't be represented ✅
```

---

## Error & loading patterns

```tsx
<ErrorBoundary fallback={<ReviewsUnavailable />}>        {/* one failing widget doesn't break the page */}
  <Suspense fallback={<ReviewsSkeleton />}>              {/* declarative loading */}
    <ProductReviews productId={id} />
  </Suspense>
</ErrorBoundary>
```

- **Next.js:** `loading.tsx` and `error.tsx` per route segment.
- **Skeletons that match the final layout** (no layout shift).
- **Every data component handles:** loading, empty, error and success.

---

## Performance patterns

- **`React.memo`, `useMemo`, `useCallback`** only where profiling shows a need, or enable the **React Compiler** (stable support in Next.js 16).
- **Code-split** heavy components with `lazy()` or `next/dynamic` (image zoom, 3D viewers, editors).
- **Virtualise** long lists.
- **`useTransition` / `useDeferredValue`** for heavy filtering.
- **Keep client components small.** Server components ship no JavaScript.

---

## Legacy patterns

| Pattern | Today |
|---|---|
| **Higher-Order Components** (`withAuth(Component)`) | Mostly replaced by hooks; still seen in older code |
| **Render props** (`<Mouse render={pos => …} />`) | Replaced by hooks; still used in some libraries |
| **Class components** | Only needed for error boundaries (or use `react-error-boundary`) |
| **`forwardRef`** | Not needed in React 19 (`ref` is a prop) |

**Know them, so you can read legacy code and explain why hooks replaced them** (wrapper hell, unclear data sources).

---

## Anti-patterns

- **Huge "god" components** (500+ lines, many responsibilities).
- **Prop drilling 5+ levels.** Use composition or context.
- **`useEffect` for derived data**, or to sync props into state.
- **Copying server data into Redux or Context.**
- **Index keys** in dynamic lists.
- **Business logic inside JSX.**
- **Inline objects and functions passed to memoised children** (without the compiler).
- **`any` everywhere in TypeScript.**

---

## What to learn

- ✅ **Composition, compound components**, slots/children patterns.
- ✅ **Custom hooks** with clean side effects (cleanup, abort, race conditions, `useEffectEvent`).
- ✅ **Container vs presentational**, and how server components change it.
- ✅ **`useReducer` and state machines** for complex flows; discriminated unions in TypeScript.
- ✅ **Error boundaries + Suspense**, and skeleton design.
- ✅ **React 19:** Actions, `useOptimistic`, `useActionState`, `use()`, `ref` as a prop, `<Activity>`.
- ✅ **Headless UI libraries** (Radix, React Aria) and polymorphic components (`as` / `asChild`).
- ✅ **Legacy patterns** (HOC, render props) for reading old code.

---

## Interview questions

**Q: Which React patterns do you use for scalable UI?**
Composition and compound components for flexible APIs, custom hooks for logic, the container/presentational split (natural with server components), reducers or state machines for complex flows, and error boundaries with Suspense for resilience.

**Q: Compound components: what and why?**
A group of components sharing implicit state through context, like Tabs/Tab/Panel. They give flexible layouts without prop explosion.

**Q: How do you manage complex side effects in custom hooks?**
Separate effects by concern, list correct dependencies, always clean up and abort, guard against race conditions, use `useEffectEvent` for latest values, and move data fetching to server components or TanStack Query instead of effects.

**Q: HOC vs hooks?**
Hooks share logic without wrapper components, are explicit about where values come from, and compose easily. HOCs caused wrapper hell and prop collisions.

---

## 🎯 Interview answer

> "For scalable UI I favour composition over configuration: small components that accept children or slots, and compound components like Tabs or Select that share state through context, which keeps APIs flexible without dozens of boolean props. Logic lives in custom hooks, like `useProductVariants`, so components just describe UI and the logic is testable; inside hooks I keep one effect per concern, clean up subscriptions and abort fetches, and use `useEffectEvent` for latest-value callbacks, while moving data fetching to server components or TanStack Query instead of effects. In the App Router, server components naturally act as containers that fetch data, and small client components handle interaction. For complex flows like checkout I use a reducer or state machine with discriminated union types so impossible states can't happen; filters live in the URL, and mutations use `useOptimistic`. Every data area is wrapped in an error boundary and Suspense with layout-matching skeletons. I memoise only where profiling shows a need, or rely on the React Compiler, and I can work with legacy HOCs and render props but migrate them to hooks."
