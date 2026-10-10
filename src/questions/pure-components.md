## Quick answer

**"Pure component" has two meanings in React:**

1. **`React.PureComponent`** (class components): a base class that **skips re-rendering when props and state are shallowly equal** to the previous ones. **`React.memo`** is the equivalent for function components (props only).
2. **Pure rendering** (all components): a component should be like a **pure function**. The same props, state and context always give the same JSX, with **no side effects during render**. React relies on this rule (StrictMode, concurrent rendering, the React Compiler).

**Both rely on the same idea:** if the inputs didn't change, the output doesn't need to change.

---

## What is a pure function

```js
// ✅ pure: same input → same output, changes nothing outside
function add(a, b) { return a + b }

// ❌ impure: the result depends on outside state, and it changes outside state
let total = 0
function addToTotal(x) { total += x; return total }   // modifies a variable outside
function now() { return Date.now() }                  // different output every call
```

**Pure function = deterministic + no side effects.** React components should render the same way.

---

## React.PureComponent

**A normal `Component` re-renders whenever its parent re-renders**, even with identical props:

```jsx
import { Component, PureComponent } from 'react'

class NormalRow extends Component {
  render() {
    console.log('NormalRow render')
    return <li>{this.props.name}</li>
  }
}

class PureRow extends PureComponent {
  render() {
    console.log('PureRow render')
    return <li>{this.props.name}</li>
  }
}

class App extends Component {
  state = { count: 0 }
  render() {
    return (
      <>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>{this.state.count}</button>
        <NormalRow name="Asha" />    {/* logs on EVERY click */}
        <PureRow name="Asha" />      {/* logs only once: props are the same, so the render is skipped */}
      </>
    )
  }
}
```

**`PureComponent` = `Component` + a built-in `shouldComponentUpdate`** that compares props and state shallowly:

```jsx
// roughly what PureComponent does for you
shouldComponentUpdate(nextProps, nextState) {
  return !shallowEqual(this.props, nextProps) || !shallowEqual(this.state, nextState)
}
```

---

## Shallow comparison

**Shallow equality compares each top-level key with `Object.is`** (similar to `===`). It does **not** look inside nested objects or arrays:

```js
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  const keysA = Object.keys(a), keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => Object.is(a[key], b[key]))
}

shallowEqual({ name: 'Asha', age: 30 }, { name: 'Asha', age: 30 })   // true:  primitives are equal
shallowEqual({ tags: ['a'] }, { tags: ['a'] })                        // false: two different arrays
const tags = ['a']
shallowEqual({ tags }, { tags })                                      // true:  the same array reference
```

**This is fast**, because it never walks deep structures. But it means **references matter**.

---

## Pitfalls

**1. Mutation: the update is ignored.** The reference stays the same, so the shallow compare says "equal":

```jsx
class TodoList extends PureComponent {
  state = { todos: [] }

  addWrong = () => {
    this.state.todos.push('New')               // ❌ mutates the same array
    this.setState({ todos: this.state.todos })  // same reference → no re-render → UI is stale
  }

  addRight = () => {
    this.setState((s) => ({ todos: [...s.todos, 'New'] }))   // ✅ new array → re-renders
  }
}
```

**2. New objects or functions created in the parent's render: the optimisation is lost.** A new reference every time means "not equal" every time:

```jsx
<PureRow style={{ color: 'red' }} />          // ❌ a new object every render
<PureRow onClick={() => select(id)} />        // ❌ a new function every render
<PureRow items={list.filter(isActive)} />     // ❌ a new array every render

// ✅ stable references: constants outside, class methods / useCallback, memoised values
const rowStyle = { color: 'red' }
```

**3. `children` are props too.** `<PureRow><span>Hi</span></PureRow>` creates new child elements every render, so the props are never equal.

**4. Context updates bypass it.** A component that uses a context re-renders when the context value changes, even if its props are equal.

---

## React.memo for function components

**`memo` gives function components the same skip-if-props-are-equal behaviour:**

```jsx
import { memo, useState, useCallback } from 'react'

const Row = memo(function Row({ name, onSelect }) {
  console.log('Row render', name)
  return <li onClick={() => onSelect(name)}>{name}</li>
})

function List() {
  const [count, setCount] = useState(0)
  const handleSelect = useCallback((name) => console.log(name), [])   // stable reference

  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <Row name="Asha" onSelect={handleSelect} />   {/* doesn't re-render on click */}
    </>
  )
}
```

**Custom comparison:**

```jsx
const Chart = memo(ChartImpl, (prevProps, nextProps) =>
  prevProps.data.version === nextProps.data.version     // return TRUE to SKIP the re-render
)
```

**Note:** `memo`'s comparator returns **`true` when the props are equal (skip)**. That's the **opposite** of `shouldComponentUpdate`, which returns **`true` to re-render**.

| | `PureComponent` | `React.memo` |
|---|---|---|
| For | Class components | Function components |
| Compares | **Props and state** | **Props only** (state: a `setState` with the same value bails out via `Object.is`) |
| How | Base class (`extends PureComponent`) | A wrapper (a HOC: `memo(Component)`) |
| Custom logic | Override `shouldComponentUpdate` (then use `Component` instead) | Second argument `arePropsEqual` |
| Status | Legacy (class components) | Current, but the **React Compiler** applies memoization automatically |

---

## Pure rendering: the rules

**Every component, class or function, should render purely:**

```jsx
// ❌ impure render
let renderCount = 0
function Clock({ user }) {
  renderCount++                               // modifies an outside variable
  user.lastSeen = Date.now()                  // mutates props
  document.title = user.name                  // side effect during render
  fetch('/api/log')                           // network request during render
  return <p>{new Date().toLocaleTimeString()}</p>   // a different output each render
}

// ✅ pure render: side effects go into event handlers or effects
function Clock({ user }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { document.title = user.name }, [user.name])
  return <p>{now.toLocaleTimeString()}</p>
}
```

**The rules:**
- **Don't mutate props, state or context** during render. Create new objects instead.
- **No side effects in render:** fetching, subscriptions, timers, DOM changes and logging belong in **event handlers** or **`useEffect`**.
- **The same inputs give the same output.** Read time or random values in state, effects or handlers, not directly in the JSX of every render.
- **Local mutation is fine:** creating and changing an array **inside** render (before returning it) is pure from the outside.

**Why React needs this:**
- **StrictMode calls your components twice in development** to expose impure renders: the double call shows up as duplicated side effects.
- **Concurrent rendering** (`useTransition`, Suspense) may render a component, throw the result away and render again. Impure renders would cause duplicate side effects.
- **The React Compiler** and `memo` skip renders by assuming the output depends only on the inputs.

---

## When to use them

**Use `memo` / `PureComponent` when:**
- A component **re-renders often with the same props** (its parent updates frequently).
- Its render is **expensive** (big lists, charts, complex trees).
- You can keep its props **stable** (primitives, memoised callbacks and objects).

**Skip it when:**
- The component is cheap (the comparison costs more than it saves).
- Its props change on almost every render anyway.
- You use the **React Compiler**, which memoizes automatically.

**Measure with the React DevTools Profiler first** (see **React app optimization techniques**).

---

## Interview Q&A

**Q: What's the difference between `Component` and `PureComponent`?**
`PureComponent` implements `shouldComponentUpdate` with a shallow comparison of props and state, so it skips re-renders when nothing changed at the top level. `Component` always re-renders when its parent does or `setState` is called.

**Q: What is the function component equivalent of `PureComponent`?**
`React.memo`, which compares props shallowly. State updates with the same value already bail out automatically.

**Q: Why might a `PureComponent` not update after `setState`?**
The state was mutated (`push`, or changing a nested property), so the reference stayed the same and the shallow comparison said "no change". Always create new objects and arrays.

**Q: Why might `memo` not prevent re-renders?**
New object, array or function props are created on every render (inline `style`, arrow functions, `.filter()`), new `children`, or a context the component uses changed.

**Q: What does it mean that React components must be pure?**
Rendering must have no side effects and must return the same output for the same props, state and context. Side effects go into event handlers and effects. StrictMode's double render helps catch violations.

**Q: Does the shallow comparison check nested objects?**
No. It compares only top-level values by reference (`Object.is`). Deep comparison would be slow, which is why immutable updates are required.

---

## 🎯 Interview answer

> "'Pure component' means two things in React. `React.PureComponent` is a class base that implements `shouldComponentUpdate` with a shallow comparison of props and state, so it skips re-rendering when the top-level values are the same by reference; `React.memo` is the function component equivalent, comparing props, with an optional comparator that returns true to skip, the opposite of `shouldComponentUpdate`. Shallow comparison is cheap but depends on references, so mutating state means the update is ignored, and inline objects, functions, filtered arrays or new children break the optimisation unless they're memoised with `useMemo` or `useCallback`. Context changes still re-render consumers. The broader meaning is pure rendering: every component should behave like a pure function of its props, state and context, with no mutation or side effects during render, because StrictMode's double render, concurrent features and the React Compiler all rely on it. I use memoization for components that re-render often with the same props and are expensive to render, after profiling, and with the React Compiler most of it happens automatically."
