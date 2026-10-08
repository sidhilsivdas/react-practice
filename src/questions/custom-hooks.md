## Short answer

A **custom hook** is a **normal JavaScript function whose name starts with `use`** and which **calls other hooks** (`useState`, `useEffect`, `useRef`...).

It lets you **reuse stateful logic** across components instead of copy-pasting it.

**Analogy:** a custom hook is like a **recipe card**. Many cooks (components) can use the same recipe, but **each cook makes their own dish**. They share the *instructions*, not the *food*.

> 🧪 **Try it live:** the [Playground](#/playground) page has working debounce, throttle, search and autosave demos built with the hooks below.

---

## Rules

1. **The name must start with `use`.** That's how React's lint rules (and the React Compiler) know to check the rules of hooks inside it.
2. **Call hooks only at the top level**, never inside `if` statements, loops or nested functions.
3. **Call them only from components or other hooks**, not from plain functions.
4. **If your function uses no hooks, it's just a utility.** Don't prefix it with `use`: `formatDate()`, not `useFormatDate()`.
5. **Each component calling the hook gets its own state.** Hooks share **logic**, not data.

---

## useWindowSize: step by step

**Goal:** a hook that always returns the **current window width and height**, and re-renders the component when the user resizes the window.

```jsx
const { width, height } = useWindowSize()
```

### Step 1: Store the size in state

The size must be **shown on screen**, so it belongs in **state** (not a ref).

```jsx
import { useState } from 'react'

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  return size
}
```

✅ It returns the size on the first render.

❌ It **never updates** when the window is resized. Nothing is listening yet.

### Step 2: Listen to the `resize` event

Adding an event listener is a **side effect**, so it goes in **`useEffect`**.

```jsx
import { useEffect, useState } from 'react'

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
  }, [])   // [] → add the listener once, after the first render

  return size
}
```

✅ Now it updates when you resize.

❌ **Memory leak:** the listener is **never removed**. If the component unmounts, the listener keeps running and calls `setSize` on a component that's gone. And in development, **StrictMode** runs the effect twice, so you get **two listeners**.

### Step 3: Clean up the listener ⭐ (the part interviewers check)

Return a **cleanup function** from the effect. React calls it when the component unmounts.

```jsx
useEffect(() => {
  function handleResize() {
    setSize({ width: window.innerWidth, height: window.innerHeight })
  }
  window.addEventListener('resize', handleResize)

  return () => window.removeEventListener('resize', handleResize)   // ✅ cleanup
}, [])
```

**Why `handleResize` is defined inside the effect:** `removeEventListener` needs the **exact same function** that was added. Defining it inside the effect means add and remove use the same reference.

### Step 4: Make the first value lazy and SSR-safe

```jsx
function getSize() {
  return { width: window.innerWidth, height: window.innerHeight }
}

const [size, setSize] = useState(getSize)   // lazy: getSize runs only on the first render
```

- **`useState(getSize)` (no parentheses)** means React calls it **once**. Writing `useState(getSize())` would call it on **every** render and throw the result away.
- **In server rendering (Next.js), `window` doesn't exist.** Guard it:

```jsx
const isBrowser = typeof window !== 'undefined'

function getSize() {
  return isBrowser
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 0, height: 0 }
}
```

### Step 5: Don't re-render 60 times a second (throttle) ⭐

**`resize` fires constantly while dragging**, maybe 30–60 times a second, and each call re-renders the component. Two common fixes:

**Option A: `requestAnimationFrame`, at most one update per screen frame:**

```jsx
useEffect(() => {
  let frameId

  function handleResize() {
    cancelAnimationFrame(frameId)                       // drop the pending update
    frameId = requestAnimationFrame(() => setSize(getSize()))
  }

  window.addEventListener('resize', handleResize)
  return () => {
    cancelAnimationFrame(frameId)
    window.removeEventListener('resize', handleResize)
  }
}, [])
```

**Option B: debounce, updating only when the user stops resizing:**

```jsx
useEffect(() => {
  let timerId

  function handleResize() {
    clearTimeout(timerId)
    timerId = setTimeout(() => setSize(getSize()), 200)
  }

  window.addEventListener('resize', handleResize)
  return () => {
    clearTimeout(timerId)
    window.removeEventListener('resize', handleResize)
  }
}, [])
```

| | rAF | Debounce |
|---|---|---|
| Updates while dragging | ✅ smooth, once per frame | ❌ waits until you stop |
| Number of re-renders | medium | lowest |
| Best for | layouts that should follow the drag | expensive work (charts, re-layout) |

### Final version ✅

```jsx
import { useEffect, useState } from 'react'

const isBrowser = typeof window !== 'undefined'

function getSize() {
  return isBrowser
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 0, height: 0 }
}

function useWindowSize() {
  const [size, setSize] = useState(getSize)

  useEffect(() => {
    let frameId

    function handleResize() {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => setSize(getSize()))
    }

    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return size
}

export default useWindowSize
```

### Step 6: Use it in a component

```jsx
function ResponsiveSearch() {
  const { width } = useWindowSize()
  const isMobile = width < 768

  return (
    <div>
      <p>Window: {width}px ({isMobile ? 'mobile' : 'desktop'})</p>
      <input placeholder={isMobile ? 'Search' : 'Search products, brands and more...'} />
      {isMobile ? <MobileMenu /> : <DesktopMenu />}
    </div>
  )
}
```

**What happens step by step:**

1. **First render:** `useState(getSize)` reads the size, so `width` is, say, 1200, and the desktop menu shows.
2. **After render:** the effect adds the `resize` listener.
3. **The user drags the window to 700px:** `resize` fires, rAF batches it, and `setSize({ width: 700, ... })` runs.
4. **State changed, so the component re-renders:** `isMobile` is true, and the mobile menu and short placeholder show.
5. **The component unmounts:** the cleanup removes the listener. No leak. ✅

### Step 7: Interview follow-ups

**Q: Should I use this hook just for styling?**
❌ No. **Use CSS media queries for styling.** They're faster, need no JavaScript, and cause no re-renders. Use the hook only when **logic** depends on the size, such as rendering different components or changing how many items to load.

**Q: The hook re-renders on every pixel, but I only care about "mobile or desktop".**
✅ Use **`useMediaQuery`**, which only re-renders when you **cross the breakpoint**:

```jsx
import { useCallback, useSyncExternalStore } from 'react'

function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', callback)
      return () => mediaQuery.removeEventListener('change', callback)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,   // current value (browser)
    () => false                               // value during server rendering
  )
}

const isMobile = useMediaQuery('(max-width: 767px)')   // re-renders only at 767 ↔ 768
```

**Q: What's `useSyncExternalStore`?**
A React 18 hook for **subscribing to things outside React** (browser APIs, stores). It's the recommended way to do it, and it avoids tearing in concurrent rendering.

```jsx
function subscribe(callback) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function useWindowWidth() {
  return useSyncExternalStore(subscribe, () => window.innerWidth, () => 0)
}
```

⚠️ **Gotcha:** the snapshot function must return the **same value** if nothing changed. Returning a **new object** like `{ width, height }` every time causes an **infinite re-render loop**. That's why this version returns just the number.

**Q: Why not `ResizeObserver`?**
`resize` tells you about the **window**. **`ResizeObserver`** watches the size of **one element**, for example a sidebar or chart container, and is the right tool for component-level responsiveness.

---

## Debounce vs throttle

| | **Debounce** | **Throttle** |
|---|---|---|
| Meaning | **Wait until the user stops**, then run once | **Run at most once every X ms** while it keeps happening |
| Analogy | 🛗 **Elevator door**: waits until people stop entering, then closes | 🚰 **Dripping tap**: one drop per second, no matter the pressure |
| Typing "react" with 300ms | runs **once**, 300ms after the last key | runs every 300ms **during** typing |
| Use for | **Search inputs**, autosave, validation | **Scroll**, resize, mouse move, infinite scroll |

**Plain JavaScript debounce** (often asked before the hook):

```js
function debounce(fn, delay) {
  let timerId
  return function (...args) {
    clearTimeout(timerId)                              // cancel the previous wait
    timerId = setTimeout(() => fn.apply(this, args), delay)
  }
}
```

---

## useDebounce

**Goal:** typing in a search box should call the API **once, after the user stops typing**, not on every key.

### Step 1: Keep a delayed copy of the value

```jsx
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  return debouncedValue
}
```

### Step 2: Update the copy after a timeout

```jsx
useEffect(() => {
  setTimeout(() => setDebouncedValue(value), delay)
}, [value, delay])
```

❌ **Not a debounce yet.** Typing "react" starts **5 timers**, and all of them fire.

### Step 3: Cancel the previous timer in the cleanup ⭐

```jsx
import { useEffect, useState } from 'react'

function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timerId)    // ✅ new value → cancel the old timer
  }, [value, delay])

  return debouncedValue
}
```

**The cleanup is what makes it a debounce.** Before the effect runs again with a new value, React runs the cleanup and cancels the old timer.

```
type "r"   → start timer
type "re"  → cleanup cancels "r" timer → start new timer
type "rea" → cleanup cancels → new timer
...stop typing...
500ms      → setDebouncedValue("react") → ONE update ✅
```

### Step 4: Use it in a search box

```jsx
function SearchUsers() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (!debouncedQuery) return setUsers([])

    const controller = new AbortController()
    fetch(`/api/users?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setUsers)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })

    return () => controller.abort()      // cancel an outdated request
  }, [debouncedQuery])                   // runs only when the DEBOUNCED value changes

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" />
      <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
    </>
  )
}
```

- **The input stays instant**, because `query` updates on every key. Only the **API call** is delayed.
- **`AbortController` prevents a race condition**, where an older, slower response arrives after a newer one and shows wrong results.

---

## useDebouncedCallback

**Goal:** debounce an **action**, like autosaving a textarea, rather than a value.

### Step 1: The classic bug ❌

```jsx
function Editor() {
  const [text, setText] = useState('')
  const save = debounce((value) => api.save(value), 1000)    // ❌ NEW function every render

  return <textarea value={text} onChange={(e) => { setText(e.target.value); save(e.target.value) }} />
}
```

Every keystroke re-renders, creating a **new** debounced function with its **own timer**. Old timers are never cancelled, so **it saves on every keystroke**.

### Step 2: Keep the timer in a ref

A ref **survives re-renders**, so all calls share **one timer**.

```jsx
function useDebouncedCallback(callback, delay = 500) {
  const timerRef = useRef(null)

  return (...args) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callback(...args), delay)
  }
}
```

✅ It debounces now.
⚠️ It might run an **old** `callback` that captured old state (a **stale closure**).

### Step 3: Always call the latest callback

```jsx
const callbackRef = useRef(callback)

useEffect(() => {
  callbackRef.current = callback        // update to the newest callback after each render
}, [callback])

// inside the timer: callbackRef.current(...args)
```

### Step 4: Stable function + cleanup on unmount ✅

```jsx
import { useCallback, useEffect, useRef } from 'react'

function useDebouncedCallback(callback, delay = 500) {
  const timerRef = useRef(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => () => clearTimeout(timerRef.current), [])   // don't fire after unmount

  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay)
    },
    [delay]                                                     // same function every render
  )
}
```

| Piece | Why |
|---|---|
| `timerRef` | One timer shared across renders |
| `callbackRef` | Always runs the newest callback, with no stale closure |
| `useCallback` | Stable reference, safe for dependency arrays and `memo` children |
| Unmount cleanup | No save after the component is gone |

### Step 5: Use it

```jsx
function Editor() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Saved')

  const save = useDebouncedCallback(async (value) => {
    setStatus('Saving...')
    await api.save(value)
    setStatus('Saved')
  }, 1000)

  return (
    <>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setStatus('Typing...')
          save(e.target.value)
        }}
      />
      <p>{status}</p>
    </>
  )
}
```

> React 19.2's **`useEffectEvent`** is the official way to "always read the latest values". The `callbackRef` pattern is what's usually asked in interviews.

---

## useThrottle

```jsx
import { useEffect, useRef, useState } from 'react'

function useThrottle(value, interval = 500) {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastRun = useRef(Date.now())

  useEffect(() => {
    const remaining = interval - (Date.now() - lastRun.current)

    const timerId = setTimeout(() => {
      lastRun.current = Date.now()
      setThrottledValue(value)
    }, Math.max(remaining, 0))   // now if enough time passed, otherwise at the next slot

    return () => clearTimeout(timerId)
  }, [value, interval])

  return throttledValue
}
```

**Steps:**

1. **Remember when it last updated** (`lastRun` ref: no re-render needed).
2. **On each new value, work out how long until the next allowed update.**
3. **Schedule the update for then.** If more values arrive, the cleanup replaces the timer, so the **latest** value is used.

```jsx
// Usage: live character counter that updates at most every 300ms
const [text, setText] = useState('')
const throttledText = useThrottle(text, 300)
<textarea value={text} onChange={(e) => setText(e.target.value)} />
<p>{throttledText.length} characters</p>
```

---

## useFetch

### Step 1: Three pieces of state

```jsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
```

### Step 2: Fetch when the URL changes

```jsx
useEffect(() => {
  setLoading(true)
  fetch(url)
    .then((res) => res.json())
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false))
}, [url])
```

❌ **Two bugs:**

- **`fetch` does NOT reject on 404 or 500.** It only rejects on network errors.
- **Race condition:** change the URL quickly and an **older** response may arrive **last** and overwrite the newer data.

### Step 3: Check `res.ok` and abort old requests ✅

```jsx
import { useEffect, useState } from 'react'

function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })

    return () => controller.abort()      // URL changed or unmounted → cancel the old request
  }, [url])

  return state
}
```

### Step 4: Use it

```jsx
function UserProfile({ id }) {
  const { data: user, loading, error } = useFetch(`/api/users/${id}`)

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>
  return <h2>{user.name}</h2>
}
```

**In real apps:** use **TanStack Query** or **SWR**, which add caching, retries, deduplication and background refetching.

---

## useLocalStorage

**Goal:** a text box whose value **survives a page refresh**, like a saved draft.

### Step 1: Read the saved value once (lazy init)

```jsx
const [value, setValue] = useState(() => {
  const saved = localStorage.getItem(key)
  return saved !== null ? JSON.parse(saved) : initialValue
})
```

The function form means `localStorage` is read **only on the first render**.

### Step 2: Save whenever it changes

```jsx
useEffect(() => {
  localStorage.setItem(key, JSON.stringify(value))
}, [key, value])
```

`localStorage` stores **strings only**, so use `JSON.stringify` and `JSON.parse`.

### Step 3: Guard against errors ✅

Storage can be **blocked** (private mode), **full**, or contain **invalid JSON**.

```jsx
import { useEffect, useState } from 'react'

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved !== null ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked: ignore
    }
  }, [key, value])

  return [value, setValue]       // same shape as useState
}
```

### Step 4: Use it

```jsx
function DraftMessage() {
  const [draft, setDraft] = useLocalStorage('draft-message', '')

  return (
    <>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type, then refresh the page" />
      <button onClick={() => setDraft('')}>Clear draft</button>
    </>
  )
}
```

---

## usePrevious

```jsx
import { useEffect, useRef } from 'react'

function usePrevious(value) {
  const ref = useRef()

  useEffect(() => {
    ref.current = value      // runs AFTER render → saved for next time
  })                         // no dependency array: after every render

  return ref.current         // during render: still the OLD value
}
```

**Step by step:**

1. **Render 1:** `ref.current` is `undefined`, so it returns `undefined`. After render, the effect saves the value.
2. **Render 2:** it returns the value from render 1, then the effect saves the new value.
3. **It works because effects run after rendering.**

```jsx
function NameInput() {
  const [name, setName] = useState('')
  const previousName = usePrevious(name)

  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <p>Now: "{name}" · Before: "{previousName}"</p>
    </>
  )
}
```

---

## useToggle

```jsx
import { useCallback, useState } from 'react'

function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((v) => !v), [])   // stable function
  return [on, toggle]
}
```

```jsx
// Usage: show / hide password
function PasswordInput() {
  const [visible, toggleVisible] = useToggle()

  return (
    <>
      <input type={visible ? 'text' : 'password'} />
      <button onClick={toggleVisible}>{visible ? 'Hide' : 'Show'}</button>
    </>
  )
}
```

- **The functional update `(v) => !v`** always flips the latest value.
- **`useCallback`** keeps `toggle` stable for `memo` children.

---

## useOnClickOutside

**Goal:** close a dropdown or modal when the user clicks **outside** it.

### Step 1: Listen for clicks on the whole document

```jsx
useEffect(() => {
  function listener(event) { /* ... */ }
  document.addEventListener('mousedown', listener)
  document.addEventListener('touchstart', listener)     // mobile
  return () => {
    document.removeEventListener('mousedown', listener)
    document.removeEventListener('touchstart', listener)
  }
}, [ref, handler])
```

### Step 2: Ignore clicks inside the element

```jsx
function listener(event) {
  if (!ref.current || ref.current.contains(event.target)) return   // inside → ignore
  handler(event)                                                   // outside → close
}
```

### Step 3: Use it

```jsx
function SearchSuggestions() {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  useOnClickOutside(boxRef, () => setOpen(false))

  return (
    <div ref={boxRef}>
      <input onFocus={() => setOpen(true)} placeholder="Search" />
      {open && <ul><li>React</li><li>Redux</li></ul>}
    </div>
  )
}
```

**Tip:** an inline `handler` re-adds the listeners on every render. Wrap it in `useCallback`, or store it in a ref as in `useDebouncedCallback`.

---

## useInterval

```jsx
import { useEffect, useRef } from 'react'

function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback          // always the latest callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return                // pass null to pause
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
```

```jsx
// Usage: a timer with no stale closure, even with count + 1
function Timer() {
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(false)

  useInterval(() => setCount(count + 1), running ? 1000 : null)

  return (
    <>
      <p>{count}s</p>
      <button onClick={() => setRunning(!running)}>{running ? 'Stop' : 'Start'}</button>
    </>
  )
}
```

**Why the ref?** Without it, `setInterval` keeps calling the callback from the **first** render, where `count` is 0 forever (a stale closure). This is Dan Abramov's famous solution.

---

## Testing hooks

Use **`renderHook`** from React Testing Library, with **fake timers** for anything time-based:

```js
import { renderHook, act } from '@testing-library/react'

test('useDebounce waits before updating', () => {
  vi.useFakeTimers()                                   // jest.useFakeTimers() in Jest
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: 'a' } }
  )

  rerender({ value: 'ab' })
  expect(result.current).toBe('a')                     // not yet

  act(() => vi.advanceTimersByTime(500))
  expect(result.current).toBe('ab')                    // updated after 500ms ✅
})

test('useWindowSize updates on resize', () => {
  const { result } = renderHook(() => useWindowSize())

  act(() => {
    window.innerWidth = 500
    window.dispatchEvent(new Event('resize'))
  })

  // with the rAF version, also flush the frame (fake timers / waitFor)
})
```

---

## Quick Q&A

**Q: What is a custom hook?**
A function starting with `use` that calls other hooks, used to **reuse stateful logic** between components.

**Q: If two components use the same custom hook, do they share state?** ⭐⭐
**No.** Each call gets its **own independent state**. To share data, use Context, lift state up, or use a store.

**Q: Why must the name start with `use`?**
So React's lint rules and the React Compiler treat it as a hook and check the rules of hooks inside it.

**Q: Custom hooks vs HOCs and render props?**
Same goal (reusing logic), but hooks avoid **wrapper hell**, add no extra components, make it clear where values come from, and combine easily.

**Q: Array or object return?**
**An array for 2 values**, so callers can name them freely: `const [on, toggle] = useToggle()`. **An object for 3 or more**: `const { data, loading, error } = useFetch(url)`.

**Q: Why wrap returned functions in `useCallback`?**
To keep the reference stable, so consumers' effects don't re-run and `memo` children don't re-render.

**Q: Why always clean up in custom hooks?**
Timers, listeners, subscriptions and requests keep running after unmount, causing **memory leaks** and state updates on unmounted components. StrictMode's double-run exposes missing cleanups.

**Q: How do you avoid stale closures in hooks?**
Functional updates (`setX(prev => ...)`), the latest-value ref pattern, correct dependency arrays, or `useEffectEvent` (React 19.2+).

**Q: Why not just call `debounce()` inside the component?**
It creates a new debounced function on every render, each with its own timer, so it never debounces. Use `useDebouncedCallback` (or `useRef` / `useMemo`).

**Q: Window size: hook or CSS?**
CSS media queries for styling. A hook (or `useMediaQuery`) only when **logic** depends on the size.

---

## 🎯 Interview answer

> "A custom hook is a function whose name starts with `use` and that calls other hooks, so we can extract and reuse stateful logic like subscriptions, timers or data fetching across components. Each component that calls it gets its own independent state, so hooks share logic, not data.
>
> For example, `useWindowSize`: I keep the width and height in state with lazy initialisation, add a `resize` listener in a `useEffect` with an empty dependency array, and return a cleanup that removes the same listener, so there's no leak on unmount. Since resize fires many times a second, I batch updates with `requestAnimationFrame` or debounce them, and guard `window` for server rendering. If I only need a breakpoint, I'd use a `useMediaQuery` hook built on `matchMedia` and `useSyncExternalStore`, and for pure styling just CSS media queries.
>
> Another classic is `useDebounce`: it stores a delayed copy of a value and sets a timeout in an effect whose cleanup clears the previous timeout, so a search box only calls the API once the user stops typing, with `AbortController` to avoid race conditions. Calling a debounce utility directly in the component body is a common bug because it creates a new debounced function each render; `useDebouncedCallback` fixes that with a timer ref, a latest-callback ref, and `useCallback`. Other frequent ones are `useFetch`, `useLocalStorage`, `usePrevious`, `useToggle`, `useOnClickOutside` and `useInterval`, and I always clean up listeners and timers and test hooks with `renderHook`."
