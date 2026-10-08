## Short answer

Both **keep their value between renders**. The difference:

- **`useState`:** changing it **re-renders**. Use it for values **shown on screen**.
- **`useRef`:** changing it **does NOT re-render**. Use it for values used **behind the scenes**.

---

## Timer example

```jsx
import { useEffect, useRef, useState } from 'react'

function Timer() {
  const [seconds, setSeconds] = useState(0)   // shown on screen → state
  const intervalRef = useRef(null)            // interval id, never shown → ref

  function start() {
    if (intervalRef.current) return           // already running
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
  }

  function stop() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  useEffect(() => {
    return () => clearInterval(intervalRef.current)   // cleanup on unmount
  }, [])

  return (
    <div>
      <p>{seconds}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  )
}
```

---

## Step by step

1. **First render:** `seconds = 0`, `intervalRef = { current: null }`, and the screen shows `0`.
2. **Click Start:** the interval ID is saved in the ref. **There's no re-render.**
3. **Every second:** `setSeconds` runs, so React re-renders. `useState` returns the new value and **`useRef` returns the same box**.
4. **Click Stop:** clear the interval and reset the ref. **There's no re-render**, and the number stays.

---

## Why not a variable?

```jsx
let intervalId   // ❌
```

**Every render runs the function again from the top**, so `intervalId` is recreated as `undefined`. After a re-render, `stop` can't find the interval. **A ref survives re-renders.**

---

## Stale closure

**The stale closure bug:**
- **The interval callback is created once**, when `seconds` was `0`.
- **With `setSeconds(seconds + 1)`, it computes `0 + 1` forever**, so it gets stuck at 1.
- **The functional update `(s) => s + 1` always gets the latest value.** ✅

---

## Cleanup

If the component **unmounts** while the timer runs, the interval keeps going in the background, which is a leak. The `useEffect` cleanup clears it.

> Closing the browser tab is not the problem, because the browser destroys everything. Cleanup matters when a component is **removed while the page stays open** (route change, conditional render).

---

## Comparison

| | `useState` | `useRef` |
|---|---|---|
| Kept between renders | ✅ | ✅ |
| Changing it re-renders | ✅ | ❌ |
| Updated | async (next render) | immediately |
| Use for | UI values | timer IDs, DOM elements, previous values |

**Other `useRef` uses:**
- **Accessing DOM elements:** `<input ref={inputRef} />` then `inputRef.current.focus()`.
- **Storing a previous value.**

---

## 🎯 Interview answer

> "Both `useState` and `useRef` persist values across renders, but updating state triggers a re-render, while updating a ref doesn't. So I use state for anything displayed in the UI, and refs for mutable values the UI doesn't depend on, like interval IDs, DOM elements or previous values. For example, in a timer, the seconds count is state, and the interval ID is a ref, so stop can clear it without causing a render. A plain variable wouldn't work because it's reset every render. I'd also use a functional update like `setSeconds(s => s + 1)` to avoid a stale closure, and clear the interval in a `useEffect` cleanup so it doesn't leak when the component unmounts."
