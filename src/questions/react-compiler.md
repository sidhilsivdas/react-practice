## Short answer

The **React Compiler** is a **separate build-time tool** that automatically adds memoization (the equivalent of `memo`, `useMemo` and `useCallback`) to your components.

**It is NOT built into React 19.** Upgrading React doesn't turn it on. You install it separately.

---

## React 19 vs Compiler

| | React 19 | React Compiler |
|---|---|---|
| What it is | The React library (`react`, `react-dom`) | A Babel plugin |
| When it runs | In the browser, at runtime | At build time (`npm run dev` / `build`) |
| Installed by default? | ✅ Yes | ❌ No, you add it |
| What it does | Renders components | Rewrites components to add memoization |

**Version support:**
- **React 19:** works directly.
- **React 17 and 18:** also work, with the extra `react-compiler-runtime` package.

---

## What it does

```jsx
// You write:
function Message({ text }) {
  return <p>{text}</p>
}

// Compiler output (simplified):
function Message({ text }) {
  const $ = cache(2)
  if ($[0] !== text) {         // only rebuild if text changed
    $[1] = <p>{text}</p>
    $[0] = text
  }
  return $[1]
}
```

**You write plain code**, and the compiler caches values, JSX and functions so they're only recreated when their inputs change.

---

## Why it exists

Manual memoization is:
- **Easy to forget**, so you get slow renders.
- **Easy to get wrong**, through wrong dependencies and stale closures.
- **Noisy**: `useCallback` everywhere makes code harder to read.

The compiler handles this for you.

---

## Rules of React

Your code has to follow the **Rules of React**:
- **Components are pure**, with no side effects during render.
- **Don't mutate props or state.**
- **Hooks are called at the top level**, not inside `if` statements or loops.

If a component breaks the rules, the compiler **skips optimising it** rather than breaking your app.

---

## Still learn memo?

**Yes.** Interviews still ask about them, existing codebases use them, and understanding re-renders is essential for debugging.

---

## 🎯 Interview answer

> "The React Compiler is a build-time Babel plugin, separate from the React library, that automatically memoizes components, values and callbacks. It analyses the code and only recomputes things when their inputs change, so we no longer need to write `memo`, `useMemo` and `useCallback` by hand in most cases. It works best with React 19 but supports 17 and 18 with a runtime package. It relies on code following the Rules of React, meaning pure components, no mutation, and hooks at the top level, and it skips components that break those rules instead of breaking them. I still think it's important to understand manual memoization for debugging and for existing codebases."
