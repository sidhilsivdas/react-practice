## Short answer

- **React 18 (2022):** made React **faster and smoother**. The engine got upgraded.
- **React 19 (Dec 2024):** made React **easier to write**, with less boilerplate for forms and async data.

---

## ⚡ React 18

### 1. Concurrent rendering (the big one)

**React can pause, interrupt and resume rendering**, so urgent updates like typing aren't blocked by heavy ones. It's enabled by the new root API:

```jsx
// Old (React 17)
ReactDOM.render(<App />, root)

// New (React 18+)
createRoot(root).render(<App />)
```

### 2. Automatic batching

```jsx
setTimeout(() => {
  setCount(1)
  setName('Sam')
  // React 17: 2 re-renders
  // React 18: 1 re-render ✅ (batched everywhere)
}, 1000)
```

### 3. Transitions: `useTransition` / `startTransition`

```jsx
const [isPending, startTransition] = useTransition()

function handleChange(e) {
  setInput(e.target.value)            // 🔴 urgent
  startTransition(() => {
    setFilter(e.target.value)         // 🟢 can wait
  })
}
```

### 4. `useDeferredValue`

```jsx
const deferredQuery = useDeferredValue(query)   // lags behind when React is busy
```

### 5. Suspense and streaming SSR

- **`<Suspense fallback={<Spinner />}>`** shows a fallback while something loads.
- **The server streams HTML in pieces**, so users see content sooner.

### 6. New hooks

- **`useId`:** unique IDs that are stable between server and client.
- **`useSyncExternalStore`:** for state libraries like Redux and Zustand.

### 7. StrictMode runs effects twice

**Setup, cleanup, setup**, to catch missing cleanups.

---

## 🚀 React 19

### 1. Actions: async functions in forms

```jsx
<form action={async (formData) => {
  await saveName(formData.get('name'))
}}>
  <input name="name" />
  <button type="submit">Save</button>
</form>
```

React handles the pending state, and the form **resets automatically** after success.

### 2. `useActionState`

```jsx
const [error, submitAction, isPending] = useActionState(
  async (prev, formData) => (await saveName(formData.get('name'))) ?? null,
  null
)
```

### 3. `useFormStatus`

```jsx
function SubmitButton() {
  const { pending } = useFormStatus()   // knows if the parent form is submitting
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>
}
```

### 4. `useOptimistic`

**Update the UI instantly before the server replies**, like a ❤️ turning red immediately, then rolling back on error.

### 5. `use()`

```jsx
const user = use(userPromise)     // suspends until resolved
const theme = use(ThemeContext)   // can be called inside if / loops!
```

### 6. `ref` as a normal prop (no `forwardRef`)

```jsx
function Input({ ref }) {
  return <input ref={ref} />
}
```

### 7. Quality-of-life changes

| Feature | Before | React 19 |
|---|---|---|
| Context provider | `<Ctx.Provider value>` | `<Ctx value>` |
| Page title / meta | `react-helmet` | `<title>` in any component |
| Ref cleanup | — | a ref callback can return a cleanup |
| Hydration errors | vague | a clear diff |

### 8. Server Components and Server Actions (stable)

- **Server Components run on the server only**, so no JavaScript is sent for them.
- **Server Actions** (`'use server'`) let a form call server code directly.
- **They're used through frameworks like Next.js.**

### 9. React 19.2

- **`<Activity mode="hidden">`:** hide UI but keep its state.
- **`useEffectEvent`:** read the latest values in an effect without adding dependencies.

> The **React Compiler** is separate: a build tool for automatic memoization.

---

## Summary

| React 18 (performance) | React 19 (developer experience) |
|---|---|
| Concurrent rendering, `createRoot` | Actions (`<form action={fn}>`) |
| Automatic batching | `useActionState`, `useFormStatus` |
| `useTransition`, `useDeferredValue` | `useOptimistic` |
| Suspense + streaming SSR | `use()` for promises and context |
| `useId`, `useSyncExternalStore` | `ref` as a prop |
| StrictMode double effects | Server Components stable |

---

## 🎯 Interview answer

> "React 18 was mainly about performance. It introduced concurrent rendering through `createRoot`, which lets React interrupt rendering to keep the UI responsive. It added automatic batching everywhere, and transitions with `useTransition` and `useDeferredValue` to mark updates as non-urgent. It improved Suspense with streaming SSR, and added `useId`.
>
> React 19 focused on developer experience, especially forms and async data. It introduced Actions, where you pass async functions to a form's `action`, with `useActionState`, `useFormStatus` and `useOptimistic` handling pending states, errors and optimistic updates. It added the `use()` API for promises and context, made `ref` a normal prop so `forwardRef` isn't needed, allowed `<title>` and meta tags directly in components, and made Server Components stable."
