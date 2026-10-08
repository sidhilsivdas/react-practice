## Short answer

StrictMode is a **development-only checker** that finds bugs early, especially **unintended side effects**.

```jsx
// main.jsx
<StrictMode>
  <App />
</StrictMode>
```

- **Renders nothing** on screen.
- **Does nothing in production.**

**Analogy:** it's a **car crash test**. Crash the car on purpose in the factory, so problems show up before customers drive it.

---

## Double run

**By running things twice on purpose** (in development only):

1. **It renders every component twice.**
2. **It runs every effect as setup, cleanup, then setup again.**

**If your code is correct, running it twice gives the same result.** If something breaks, you've found a hidden bug.

---

## Impure render

```jsx
let count = 0

function Counter() {
  count++                // ❌ changes something outside during render
  return <p>{count}</p>
}
```

- **Without StrictMode:** shows `1`. It looks fine.
- **With StrictMode:** shows `2`. The bug is visible.

Render must be **pure**: same input gives the same output, with no outside changes. React (Fiber) may re-run renders anyway, so this bug would appear randomly in production.

---

## Missing cleanup

```jsx
useEffect(() => {
  setInterval(() => setSeconds((s) => s + 1), 1000)
  // ❌ no cleanup
}, [])
```

**Setup, cleanup, setup leaves 2 intervals**, so the timer counts **2 per second**. That's your bug alarm.

```jsx
useEffect(() => {
  const id = setInterval(() => setSeconds((s) => s + 1), 1000)
  return () => clearInterval(id)   // ✅ cleanup
}, [])
```

Now only 1 interval runs. ✅

**Real bugs this catches:** leftover timers, duplicate event listeners, and open connections (sockets, subscriptions).

---

## Other warnings

- **Deprecated or legacy React APIs.**
- **Patterns that won't work with concurrent features.**

---

## Common confusion

- **"Why does `console.log` print twice?"** StrictMode. It's expected.
- **"Why does my API call run twice in development?"** The effect runs twice on purpose. Handle it with cleanup (ignore or cancel the first request). In production it runs once.
- **"Should I remove StrictMode?"** ❌ No. That hides bugs instead of fixing them.

---

## 🎯 Interview answer

> "StrictMode is a development-only tool that helps find bugs early. It doesn't render anything and has no effect in production. To catch unintended side effects, it deliberately renders components twice and runs effects as setup, cleanup, then setup again. If render logic is impure, or an effect is missing cleanup, like a timer or event listener that isn't cleared, the double run makes the bug visible. It also warns about deprecated APIs. So a double console.log in development is expected, and the fix is to make components pure and add proper cleanup, not to remove StrictMode."
