## Short answer

A component re-renders for only **three reasons**:

1. **Its own state changes.**
2. **Its parent re-renders.**
3. **A context it uses changes.**

---

## State change

```jsx
setSeconds((s) => s + 1)   // this component re-renders
```

This includes state inside custom hooks and `useReducer`.

**Catch: setting the same value skips the re-render.** React compares with `Object.is`:

```jsx
setInput('hello')   // already 'hello' → skipped
```

Objects and arrays are compared **by reference**:

```jsx
setUser({ name: 'Sam' })   // new object → re-renders
user.name = 'Sam'          // mutating → same reference → NO re-render (bug!)
setUser(user)
```

✅ Always create a new object: `setUser({ ...user, name: 'Sam' })`.

---

## Parent re-render

**When a parent re-renders, all its children re-render by default, even if their props didn't change.**

```jsx
function MessageForm() {
  const [submitted, setSubmitted] = useState('')
  return (
    <>
      <InputBox onSubmit={setSubmitted} />   // re-renders
      <Message text={submitted} />           // re-renders
    </>
  )
}
```

- **It flows down** to children of children.
- **It never goes up.** A child re-rendering doesn't re-render its parent.

---

## Context change

```jsx
<ThemeContext value={theme}>   // theme changes...
  <Button />                   // uses useContext(ThemeContext) → re-renders
</ThemeContext>
```

---

## What doesn’t re-render

| Thing | Re-renders? | Why |
|---|---|---|
| Changing a ref (`ref.current = 5`) | ❌ | Refs are deliberately silent |
| Changing a normal variable | ❌ | React doesn't track it |
| Mutating state (`arr.push(x)`) | ❌ | Same reference |
| "Props changed" on their own | — | Props change **because the parent re-rendered** |

> **Common misconception:** "A component re-renders when its props change." Not quite. It re-renders because its **parent** did.

---

## Avoiding re-renders

- **`React.memo(Child)`:** skip the re-render if its props are the same.
- **`useCallback` / `useMemo`:** keep function, object and array props stable so `memo` works.
- **Move state down:** keep state in the smallest component that needs it.
- **React Compiler:** adds memoization automatically.

---

## Re-render ≠ DOM update

**Re-render** means your function ran and React diffed the result. **DOM update** happens only if the diff found a change. Re-renders are usually cheap.

---

## 🎯 Interview answer

> "A component re-renders in three cases: its own state changes to a different value, compared with `Object.is`; its parent re-renders, because by default all children re-render regardless of props; or a context it consumes changes. Refs, plain variables and mutations never trigger a re-render, which is why state must be updated immutably. 'Props changed' isn't really a separate cause, it's a result of the parent re-rendering. To skip unnecessary renders you can use `React.memo` with stable props via `useCallback` and `useMemo`, or move state down. And a re-render doesn't mean a DOM update: React only touches the DOM if the diff finds changes."
