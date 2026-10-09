## Short answer

React has **two ways to write a component**:

| | **Class component** (old) | **Function component** (modern ✅) |
|---|---|---|
| Written as | `class X extends React.Component` | a plain function |
| State | `this.state` + `this.setState` | `useState` |
| Side effects | **lifecycle methods** (`componentDidMount`...) | **`useEffect`** |
| Reusing logic | HOCs / render props | **custom hooks** |
| `this` keyword | needed everywhere (and must be bound) | ❌ none |
| Status | still supported; used in old code | **recommended** for all new code |

**The one thing only classes can still do:** **Error Boundaries** (`componentDidCatch`).

**Analogy:**

- **A class component is like a manual car** 🚗: you handle each gear (lifecycle stage) yourself.
- **A function component with hooks is like an automatic car**: you say **what** should stay in sync, and React handles **when**.

---

## Same component, both ways

### Class component

```jsx
import React from 'react'

class Counter extends React.Component {
  constructor(props) {
    super(props)
    this.state = { count: 0 }
    this.increment = this.increment.bind(this)   // ⚠️ needed, or `this` is lost
  }

  increment() {
    this.setState({ count: this.state.count + 1 })
  }

  render() {
    return <button onClick={this.increment}>Clicked {this.state.count} times</button>
  }
}
```

### Function component

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
}
```

**Same result: no `constructor`, no `this`, no `bind`, about half the code.**

---

## Lifecycle phases

Every component goes through **3 phases**, plus error handling:

```
  MOUNTING (born)         UPDATING (changes)             UNMOUNTING (removed)
  ───────────────         ──────────────────             ────────────────────
  constructor             getDerivedStateFromProps        componentWillUnmount
  getDerivedStateFrom..   shouldComponentUpdate
  render                  render
  componentDidMount ⭐    getSnapshotBeforeUpdate
                          componentDidUpdate ⭐

  ERRORS:  getDerivedStateFromError, componentDidCatch
```

**The 3 you'll use 95% of the time:**

| Method | When it runs | Typical use |
|---|---|---|
| `componentDidMount` | **once**, after the first render | fetch data, add listeners, start timers |
| `componentDidUpdate(prevProps, prevState)` | after **every** update | refetch when a prop changed |
| `componentWillUnmount` | right before removal | **clean up**: remove listeners, clear timers |

---

## Lifecycle to hooks

| Class lifecycle | Hook equivalent |
|---|---|
| `constructor` (set up state) | `useState(initialValue)` / `useRef` |
| **`componentDidMount`** | **`useEffect(() => { ... }, [])`** |
| **`componentDidUpdate`** | **`useEffect(() => { ... }, [dep])`** |
| **`componentWillUnmount`** | **the `return` cleanup in `useEffect`** |
| `shouldComponentUpdate` | `React.memo(Component)` ⚠️ (opposite meaning, see below) |
| `getDerivedStateFromProps` | calculate the value **during render** (or use a `key` to reset) |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` (closest, not exact) |
| `componentDidCatch` / `getDerivedStateFromError` | ❌ **no hook**, so you still need a class Error Boundary |
| `this.forceUpdate()` | `const [, forceUpdate] = useReducer((x) => x + 1, 0)` (rarely needed) |

### Side by side

```jsx
// componentDidMount → run ONCE after first render
componentDidMount() { console.log('mounted') }
useEffect(() => { console.log('mounted') }, [])

// componentDidUpdate → run when something changes
componentDidUpdate(prevProps) {
  if (prevProps.userId !== this.props.userId) console.log('user changed')
}
useEffect(() => { console.log('user changed') }, [userId])

// componentWillUnmount → clean up
componentWillUnmount() { clearInterval(this.timer) }
useEffect(() => {
  const timer = setInterval(tick, 1000)
  return () => clearInterval(timer)          // ← cleanup = willUnmount
}, [])

// shouldComponentUpdate → skip re-render
shouldComponentUpdate(nextProps) {
  return nextProps.value !== this.props.value   // return TRUE to re-render
}
const Child = memo(function Child({ value }) { ... })   // re-renders only if props changed
// (memo's custom compare returns TRUE to SKIP: the opposite of shouldComponentUpdate!)
```

---

## Real example

**Fetch a user, refetch when `userId` changes, and clean up.** This example shows **why hooks won**.

### Class: logic split across 3 methods

```jsx
class UserProfile extends React.Component {
  state = { user: null }

  componentDidMount() {
    this.fetchUser()                                   // 1. on mount
  }

  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {      // 2. on change (manual check!)
      this.fetchUser()
    }
  }

  componentWillUnmount() {
    this.controller?.abort()                           // 3. on unmount
  }

  fetchUser() {
    this.controller?.abort()
    this.controller = new AbortController()
    fetch(`/api/users/${this.props.userId}`, { signal: this.controller.signal })
      .then((res) => res.json())
      .then((user) => this.setState({ user }))
      .catch(() => {})
  }

  render() {
    return <h2>{this.state.user?.name ?? 'Loading...'}</h2>
  }
}
```

### Function: everything in one place

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setUser)
      .catch(() => {})

    return () => controller.abort()     // runs on unmount AND before the next userId
  }, [userId])                          // mount + update in one line

  return <h2>{user?.name ?? 'Loading...'}</h2>
}
```

**One `useEffect` replaces three lifecycle methods.** Code that belongs together (start the request and cancel it) **stays together**.

---

## Mental model

**Classes think in time:** "**when** the component mounts, do X. **When** it updates, check if Y changed..."

**Hooks think in sync:** "**keep** this effect in sync with `userId`." React decides when to run it.

**Important:** the cleanup runs **before every re-run**, not only on unmount:

```
userId = 1  → effect runs (fetch user 1)
userId = 2  → cleanup (abort fetch 1)  →  effect runs (fetch user 2)
unmount     → cleanup (abort fetch 2)
```

**Timing detail:**

- **`componentDidMount` / `componentDidUpdate` run before the browser paints**, the same timing as **`useLayoutEffect`**.
- **`useEffect` usually runs after the paint**, so it doesn't block the screen. That's better for most work.
- **Use `useLayoutEffect` only to measure the DOM** before the user sees it.

---

## HOC vs custom hook

**Goal:** many components need the window width.

### Class era: Higher-Order Component (HOC)

```jsx
function withWindowWidth(Component) {
  return class extends React.Component {
    state = { width: window.innerWidth }
    handleResize = () => this.setState({ width: window.innerWidth })

    componentDidMount() { window.addEventListener('resize', this.handleResize) }
    componentWillUnmount() { window.removeEventListener('resize', this.handleResize) }

    render() {
      return <Component {...this.props} width={this.state.width} />
    }
  }
}

const Header = withWindowWidth(function Header({ width }) {
  return <p>Width: {width}</p>
})
```

**HOC problems:**

- **"Wrapper hell":** `withAuth(withTheme(withWindowWidth(Header)))`.
- **Unclear where props come from.**
- **Prop name clashes.**

### Hooks era: custom hook ✅

```jsx
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)                  // didMount
    return () => window.removeEventListener('resize', handleResize)  // willUnmount
  }, [])

  return width
}

function Header() {
  const width = useWindowWidth()        // clear where it comes from ✅
  return <p>Width: {width}</p>
}
```

| | HOC / render props | Custom hook |
|---|---|---|
| Extra components in the tree | ✅ yes (wrapper hell) | ❌ none |
| Where does the data come from? | hidden in props | obvious: `const width = useWindowWidth()` |
| Combining several | nested wrappers | just call several hooks |
| Name clashes | possible | ❌ you name the variables |

---

## Error Boundary

**Still needs a class:**

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }                // show the fallback UI
  }

  componentDidCatch(error, info) {
    console.error(error, info)               // log it (e.g. send to Sentry)
  }

  render() {
    return this.state.hasError ? <p>Something went wrong.</p> : this.props.children
  }
}

<ErrorBoundary>
  <UserProfile userId={1} />
</ErrorBoundary>
```

**In practice, many teams use the `react-error-boundary` package**, so they don't write the class themselves.

**Error boundaries do NOT catch errors from:** event handlers, async code (`setTimeout`, promises) or server rendering. Use `try/catch` for those.

---

## State differences

```jsx
// Class: setState MERGES objects
this.state = { name: 'Sam', age: 25 }
this.setState({ age: 26 })                // → { name: 'Sam', age: 26 } ✅ name kept

// Hooks: setState REPLACES
const [user, setUser] = useState({ name: 'Sam', age: 25 })
setUser({ age: 26 })                      // → { age: 26 } ❌ name lost!
setUser({ ...user, age: 26 })             // ✅ spread to keep the rest

// Tip: with hooks, use separate states
const [name, setName] = useState('Sam')
const [age, setAge] = useState(25)
```

---

## Other component types

| Type | Meaning |
|---|---|
| **Pure component / `React.memo`** | Skips re-render when props are the same (`PureComponent` for classes, `memo` for functions) |
| **Higher-Order Component (HOC)** | A function that takes a component and returns an enhanced one |
| **Controlled component** | Form input whose value comes from state (`value` + `onChange`) |
| **Uncontrolled component** | Form input that keeps its own value (read with a `ref` or `FormData`) |
| **Presentational vs container** | UI-only vs data-fetching (an older pattern; hooks blur the line) |
| **Server vs client components** | React 19 / Next.js: runs only on the server vs in the browser (`'use client'`) |
| **Lazy component** | Loaded on demand: `lazy(() => import('./Page'))` |

---

## Quick Q&A

**Q: Which lifecycle methods does `useEffect` replace?**
`componentDidMount` (`[]`), `componentDidUpdate` (`[deps]`) and `componentWillUnmount` (the cleanup function).

**Q: How do you run code only on mount?**
`useEffect(() => { ... }, [])`. (In development, StrictMode runs it twice on purpose.)

**Q: How do you run code only on updates, not on mount?**
Skip the first run with a ref:

```jsx
const isFirst = useRef(true)
useEffect(() => {
  if (isFirst.current) { isFirst.current = false; return }
  console.log('updated')
}, [value])
```

**Q: Equivalent of `shouldComponentUpdate`?**
`React.memo`. Note the opposite return value in its custom comparison: `true` means **skip** the re-render.

**Q: Can function components be Error Boundaries?**
**No.** There's no hook for `componentDidCatch`, so you need a class (or the `react-error-boundary` package).

**Q: Why did React move to hooks?**
Related logic stays together instead of being split across lifecycle methods, there's no `this` and no binding, logic is reusable through custom hooks without wrapper hell, there's less code, and it works well with concurrent features and the React Compiler.

**Q: Are class components deprecated?**
**No.** They're still supported, but **function components are recommended** for new code.

**Q: Difference in how they read props?**
A function component **captures props for each render**, so a `setTimeout` inside it sees the props **from that render**. A class reads `this.props` **when the code runs**, which may already be **newer**: an alert started for user A can end up showing user B if the prop changed before it fired.

---

## 🎯 Interview answer

> "React components can be written as classes or functions. Class components extend `React.Component`, keep state in `this.state`, update it with `setState`, which merges objects, and handle side effects in lifecycle methods. Function components are plain functions that use hooks, and they're the recommended approach today. The three main lifecycle methods map to `useEffect`: `componentDidMount` is `useEffect` with an empty dependency array, `componentDidUpdate` is `useEffect` with dependencies, and `componentWillUnmount` is the cleanup function the effect returns. `shouldComponentUpdate` maps to `React.memo`, and `getDerivedStateFromProps` is usually replaced by computing values during render. The mental model changes too: instead of thinking about when the component mounts or updates, an effect keeps something in sync with its dependencies, and its cleanup runs before every re-run as well as on unmount. That keeps related logic together, for example fetching a user and aborting the request, instead of splitting it across three methods. For reuse, classes used HOCs and render props, which led to wrapper hell, while custom hooks like `useWindowWidth` share logic without extra components. The one thing still requiring a class is an Error Boundary, using `getDerivedStateFromError` and `componentDidCatch`."
