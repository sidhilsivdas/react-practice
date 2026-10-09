## Problem

Write `debounce(fn, delay)` that returns a **new function**. Calling it **waits `delay` ms** before running `fn`. If it's called **again during the wait, the timer restarts**. So `fn` runs **once**, after the calls **stop**, with the **latest arguments**.

## Examples

```js
const log = debounce((text) => console.log('Search:', text), 300)

log('r')
log('re')
log('rea')
// ...300ms of silence...
// → "Search: rea"   (only once, with the last value)
```

**Real use:** a search box that calls the API only after the user stops typing.

## Hints

1. **You need a timer ID that survives between calls.** Where can a returned function keep a variable? (closure)
2. **Every call:** cancel the old timer, then start a new one.
3. **Pass the latest arguments through** to `fn`.

<!-- SOLUTION -->

## Solution

```js
function debounce(fn, delay) {
  let timerId                              // shared by every call (closure)

  return function (...args) {
    clearTimeout(timerId)                  // cancel the previous wait
    timerId = setTimeout(() => {
      fn.apply(this, args)                 // run with the latest args (and `this`)
    }, delay)
  }
}
```

**Step by step:** `log('r')`, `log('re')`, `log('rea')` within 300ms:

```
t=0ms    log('r')   → clear (nothing) → start timer A (fires at 300)
t=100ms  log('re')  → clear timer A   → start timer B (fires at 400)
t=200ms  log('rea') → clear timer B   → start timer C (fires at 500)
t=500ms  timer C fires → fn('rea')  ✅ ran once
```

**Key ideas:**

| Piece | Why |
|---|---|
| `let timerId` outside the returned function | A **closure**: every call sees the same timer |
| `clearTimeout(timerId)` | The "restart the wait" part |
| `...args` | Pass the **latest** arguments |
| `fn.apply(this, args)` | Keeps `this` working if the debounced function is used as an object method |
| Regular `function`, not an arrow | So `this` is the caller's `this` (see the `this` keyword question) |

## Leading & cancel

**Follow-ups interviewers ask:**

```js
function debounce(fn, delay, { leading = false } = {}) {
  let timerId

  function debounced(...args) {
    const callNow = leading && !timerId    // leading: run on the FIRST call right away
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      timerId = null
      if (!leading) fn.apply(this, args)
    }, delay)
    if (callNow) fn.apply(this, args)
  }

  debounced.cancel = () => {               // cancel a pending call (e.g. on unmount)
    clearTimeout(timerId)
    timerId = null
  }

  return debounced
}
```

- **Leading:** run **immediately** on the first call, then ignore calls until things are quiet. Good for a "Submit" button that shouldn't double-fire.
- **`cancel()`:** clear a pending call, for example in a React `useEffect` cleanup.

## In React

**⚠️ Don't create the debounced function inside the component body.** Every render makes a **new** one with a new timer, so it never debounces. Keep it stable:

```jsx
const debouncedSearch = useMemo(() => debounce((q) => fetchResults(q), 300), [])
useEffect(() => () => debouncedSearch.cancel?.(), [debouncedSearch])   // cleanup
```

(Or use the `useDebounce` / `useDebouncedCallback` hooks from the **Custom hooks** question.)

## 🎯 Interview answer

> "Debounce returns a wrapper function that delays calling the original until calls stop for `delay` milliseconds. I keep a `timerId` in a closure so every call shares it. Each call clears the previous timeout and starts a new one that calls `fn.apply(this, args)` with the latest arguments, so the function runs once, after the last call. I use a regular function so `this` is preserved. Common follow-ups are a `leading` option to run on the first call, and a `cancel` method to clear a pending call, which matters in React cleanups. In React, the debounced function must be created once, with `useMemo` or a ref, otherwise every render creates a new timer."
