## Short answer

- **`React.memo`** skips re-rendering a child when its props are the same.
- **But functions are recreated on every render**, so a function prop is always "different" and `memo` is wasted.
- **`useCallback`** keeps the function the same between renders, so `memo` works again.

---

## ✅ memo works

```jsx
import { memo, useState } from 'react'

const Child = memo(function Child({ label }) {
  console.log('Child rendered')
  return <button>{label}</button>
})

function Parent() {
  const [text, setText] = useState('')
  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <Child label="Click me" />
    </div>
  )
}
```

**Typing re-renders `Parent`, but not `Child`**, because its `label` string is the same. `Child rendered` logs **once**.

---

## ❌ Wasted memo

```jsx
function Parent() {
  const [text, setText] = useState('')
  const [count, setCount] = useState(0)

  const handleClick = () => {          // ❌ new function every render
    setCount((c) => c + 1)
  }

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <p>Count: {count}</p>
      <Child onClick={handleClick} />
    </div>
  )
}
```

**`Child` now re-renders on every keystroke.**

**Why:**
1. **Every `Parent` render creates a brand new `handleClick` function.**
2. **`memo` compares props with `Object.is`:**
   ```js
   (() => {}) === (() => {})   // false
   ```
3. **So `memo` thinks `onClick` changed every time.**

You pay for `memo`'s comparison **and** for the re-render, which is worse than no `memo` at all.

---

## ✅ Fix with useCallback

```jsx
import { memo, useCallback, useState } from 'react'

const handleClick = useCallback(() => {
  setCount((c) => c + 1)
}, [])   // no dependencies → same function forever
```

**`Child` is skipped again while typing**, and even when `count` changes.

---

## ⚠️ Dependency trap

```jsx
// ❌ Bug: count frozen at 0 (stale closure)
useCallback(() => setCount(count + 1), [])

// ⚠️ Works, but recreated on each click → Child re-renders
useCallback(() => setCount(count + 1), [count])

// ✅ Best: functional update, no dependencies
useCallback(() => setCount((c) => c + 1), [])
```

---

## Summary

| Setup | Child re-renders while typing? |
|---|---|
| No `memo` | Yes |
| `memo` + plain function prop | **Yes: memo wasted** |
| `memo` + `useCallback` prop | No ✅ |

**Rules:**
- **`useCallback` only helps when the function goes to a `memo` child** (or into a dependency array).
- **The same problem applies to objects and arrays** (`style={{...}}`, `items={[...]}`). Fix those with **`useMemo`**.
- **`setState` functions are already stable**, so pass them directly with no `useCallback` needed.

---

## 🎯 Interview answer

> "`React.memo` skips re-rendering a component when its props are shallowly equal. But in JavaScript, functions are objects, and an inline function is recreated on every parent render, so `memo` sees a new prop each time and re-renders anyway. Then we're paying for the comparison and still re-rendering. `useCallback` memoizes the function reference so it stays the same between renders unless its dependencies change, and that makes `memo` effective. I'd use a functional state update to keep the dependency array empty and avoid stale closures. The same applies to object and array props with `useMemo`. With the React Compiler, much of this can now be done automatically."
