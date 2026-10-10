## Quick answer

**A Higher-Order Component (HOC) is a function that takes a component and returns a new, enhanced component.**

```jsx
const EnhancedComponent = withSomething(WrappedComponent)
```

- It's used to **reuse logic across many components**: authentication checks, loading states, logging, feature flags, error boundaries, injecting data.
- The name comes from **higher-order functions**: functions that take or return other functions (like `map`, or `debounce`).
- **Today, custom hooks replace most HOCs.** But HOCs are still useful for wrapping a component **from the outside**, for example with an error boundary, an auth gate or providers, and you'll see them in older code and libraries (`connect` from React Redux, `memo`).

---

## The idea step by step

**A normal component:** props → UI.
**A HOC:** component → **new component**.

```jsx
// 1. the HOC: a plain function
function withLoading(WrappedComponent) {
  // 2. return a NEW component
  return function WithLoading({ isLoading, ...props }) {
    // 3. the extra behaviour
    if (isLoading) return <p>Loading…</p>
    // 4. render the original component, passing the other props through
    return <WrappedComponent {...props} />
  }
}

// a normal component that knows nothing about loading
function UserList({ users }) {
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}

// 5. create the enhanced version once, outside any component
const UserListWithLoading = withLoading(UserList)

// 6. use it
<UserListWithLoading isLoading={loading} users={users} />
```

**What happens:**
1. `withLoading(UserList)` runs **once** and returns the `WithLoading` component.
2. React renders `WithLoading`. It reads `isLoading`:
   - if `true`, it shows "Loading…";
   - otherwise it renders `UserList` with the remaining props (`users`).
3. `UserList` stays simple and reusable. The loading logic lives in **one place** and can wrap any component.

---

## Real-world examples

**1. Authentication / authorisation gate:**

```jsx
import { Navigate } from 'react-router'

function withAuth(WrappedComponent, { role } = {}) {
  return function WithAuth(props) {
    const { user } = useAuth()                          // hooks work inside the HOC's component
    if (!user) return <Navigate to="/login" replace />
    if (role && user.role !== role) return <p>You don't have access to this page.</p>
    return <WrappedComponent {...props} user={user} />  // inject an extra prop
  }
}

const AdminDashboard = withAuth(Dashboard, { role: 'admin' })
```

**2. Error boundary around any component:**

```jsx
import { ErrorBoundary } from 'react-error-boundary'

function withErrorBoundary(WrappedComponent, fallback = <p>Something went wrong.</p>) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

const SafeChart = withErrorBoundary(SalesChart)   // a chart crash no longer breaks the whole page
```

**3. Analytics / logging:**

```jsx
function withPageView(WrappedComponent, pageName) {
  return function WithPageView(props) {
    useEffect(() => { analytics.track('page_view', { page: pageName }) }, [])
    return <WrappedComponent {...props} />
  }
}
```

**4. Feature flags:**

```jsx
function withFeature(WrappedComponent, flag, Fallback = () => null) {
  return function WithFeature(props) {
    const enabled = useFeatureFlag(flag)
    return enabled ? <WrappedComponent {...props} /> : <Fallback {...props} />
  }
}

const NewCheckout = withFeature(CheckoutV2, 'checkout-v2', CheckoutV1)
```

**HOCs you already know:**

| HOC | What it adds |
|---|---|
| `React.memo(Component)` | Skips re-renders when props are equal (see **Pure components & React.memo**) |
| `connect(mapState, mapDispatch)(Component)` (React Redux) | Injects store state and actions as props (older style; `useSelector` replaced it) |
| `observer(Component)` (MobX) | Re-renders when observed data changes |
| `withRouter(Component)` (React Router v5) | Injected `history`, `location`, `match`. Removed in v6 in favour of hooks. |
| `styled(Component)` (styled-components) | Adds styles |

---

## Rules for writing HOCs

**1. Don't modify the original component.** Wrap it (composition). A HOC should be a **pure function**:

```jsx
// ❌ mutating: changes UserList everywhere it's used
function withBadLogger(Component) {
  Component.prototype.componentDidMount = () => console.log('mounted')
  return Component
}
```

**2. Pass through the props you don't use**, with `{...props}`. Otherwise the wrapped component loses them.

**3. Create HOCs outside render.** A new component type on every render means React **unmounts and remounts** it each time (state is lost, and it's slow):

```jsx
function Page() {
  const Enhanced = withLoading(UserList)   // ❌ a new component every render
  return <Enhanced isLoading={false} users={[]} />
}
// ✅ const Enhanced = withLoading(UserList) at module level
```

**4. Set a display name** so React DevTools shows `WithAuth(Dashboard)` instead of an anonymous component:

```jsx
function withAuth(WrappedComponent) {
  function WithAuth(props) { /* … */ }
  WithAuth.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`
  return WithAuth
}
```

**5. Refs:** in **React 19**, `ref` is a normal prop for function components, so `{...props}` passes it through. In older React, you needed `forwardRef` inside the HOC.

**6. Static methods aren't copied automatically** (e.g. `Component.loadData`). Copy them manually, or use `hoist-non-react-statics`.

**7. Avoid prop name collisions:** if two HOCs inject a prop with the same name (`data`), one silently overwrites the other. Use specific names (`user`, `featureEnabled`).

**Composing several HOCs:**

```jsx
const Enhanced = withAuth(withErrorBoundary(withPageView(Dashboard, 'dashboard')))

// or with a compose helper (applied right to left)
const compose = (...hocs) => (Component) => hocs.reduceRight((acc, hoc) => hoc(acc), Component)
const Enhanced2 = compose(withAuth, withErrorBoundary)(Dashboard)
```

---

## HOC vs render props vs custom hooks

**The same logic three ways: the current window width.**

```jsx
// HOC: logic wraps the component, and data arrives as a prop
const Header = withWindowWidth(function Header({ width }) { return <h1>{width}px</h1> })

// render prop: a component calls a function you pass
<WindowWidth>{(width) => <h1>{width}px</h1>}</WindowWidth>

// custom hook: the modern way
function Header() {
  const width = useWindowWidth()
  return <h1>{width}px</h1>
}
```

| | HOC | Render props | Custom hook |
|---|---|---|---|
| Extra components in the tree | Yes ("wrapper hell" in DevTools) | Yes | **None** |
| Where does the data come from? | Hidden (a magic prop) | Visible in JSX | **Obvious** (`const x = useX()`) |
| Prop name collisions | Possible | No | No |
| Combining several | Nesting: `withA(withB(withC(C)))` | Nested callbacks ("callback hell") | **Just call several hooks** |
| TypeScript | Harder (injected props) | OK | **Easy** |
| Can control *whether* the component renders | ✅ yes (auth gate, feature flag) | ✅ yes | ❌ the component itself must decide |
| Can wrap with boundaries or providers | ✅ yes | ✅ yes | ❌ no |

**When to use which:**
- **Sharing stateful logic** (data, subscriptions, window size, forms): **custom hook**.
- **Wrapping a component from the outside** (error boundaries, auth or feature gates, providers, analytics on many pages), or **library APIs**: a HOC is still a good fit.

---

## Typing HOCs in TypeScript

```tsx
import type { ComponentType } from 'react'

type InjectedProps = { user: User }

function withAuth<P extends InjectedProps>(WrappedComponent: ComponentType<P>) {
  // the outer component does NOT require `user`: the HOC provides it
  return function WithAuth(props: Omit<P, keyof InjectedProps>) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    return <WrappedComponent {...(props as P)} user={user} />
  }
}

function Profile({ user, showEmail }: { user: User; showEmail: boolean }) { /* … */ }
const ProtectedProfile = withAuth(Profile)
<ProtectedProfile showEmail />          // ✅ `user` isn't required here
```

(The `as P` cast is the standard workaround: TypeScript can't prove that `Omit<P, 'user'> & { user }` equals `P`.)

---

## Interview Q&A

**Q: What is a Higher-Order Component?**
A function that takes a component and returns a new component with extra behaviour or props, without changing the original.

**Q: Is a HOC a component?**
No, it's a function. The thing it **returns** is a component.

**Q: Why are HOCs less common today?**
Custom hooks share logic without extra wrapper components, hidden props, name collisions or typing pain.

**Q: When would you still write a HOC?**
To wrap components from the outside: error boundaries, auth or feature-flag gates, providers, analytics, or for library APIs that must work with any component.

**Q: Why must you not create a HOC inside render?**
It creates a new component type on every render, so React unmounts and remounts the subtree each time, losing state and hurting performance.

**Q: Name some HOCs from libraries.**
`React.memo`, React Redux `connect`, MobX `observer`, React Router v5 `withRouter`, styled-components `styled()`.

---

## 🎯 Interview answer

> "A higher-order component is a function that takes a component and returns a new, enhanced component, the component version of a higher-order function. It's a composition pattern for reusing cross-cutting logic: for example, `withAuth` redirects unauthenticated users or injects the user, `withErrorBoundary` isolates crashes, and others handle feature flags, loading states or analytics. A good HOC doesn't mutate the wrapped component, passes through the props it doesn't use, sets a display name for DevTools, is created once at module level rather than inside render, avoids prop name collisions, and handles static methods; in React 19 refs pass through as normal props. Familiar examples are `React.memo`, Redux's `connect` and MobX's `observer`. Today I use custom hooks for sharing stateful logic, because they avoid wrapper hell, hidden props and typing pain, and I keep HOCs for cases where I need to wrap a component from the outside, like error boundaries, access gates and providers."
