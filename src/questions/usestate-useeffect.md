## Short answer

- **`useState`** stores a value that **survives re-renders**. Changing it **re-renders** the component.
- **`useEffect`** runs **side effects** after rendering: fetching data, timers, event listeners, subscriptions.
- **Cleanup** is the function you **return from `useEffect`**. React calls it **before the effect runs again** and **when the component is removed**, to stop whatever the effect started.

**Analogy: renting a hotel room** 🏨

- **Effect** = you **check in**: turn on the lights and the AC.
- **Cleanup** = you **check out**: turn off the lights and AC, and return the key.
- **Change room (dependency changes)?** Check out of the old room first, **then** check into the new one.
- **Leave the hotel (unmount)?** Check out.
- **Forget to check out?** You keep paying for a room you're not using. That's a **memory leak**.

---

## useState basics

### 1. The initial value is used only on the first render

```jsx
const [count, setCount] = useState(0)   // 0 is used once; later renders ignore it
```

### 2. Lazy initialisation for expensive starting values

```jsx
const [todos, setTodos] = useState(JSON.parse(localStorage.getItem('todos')))        // ❌ runs EVERY render
const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem('todos')))  // ✅ runs ONCE
```

### 3. State updates are NOT immediate ⭐

```jsx
function handleClick() {
  setCount(count + 1)
  console.log(count)        // ❌ still the OLD value
}
```

**State is a snapshot for each render.** `count` is a constant inside this render. You'll see the new value on the **next** render.

### 4. Functional updates ⭐ (classic interview question)

```jsx
// count is 0
function handleClick() {
  setCount(count + 1)   // 0 + 1
  setCount(count + 1)   // 0 + 1
  setCount(count + 1)   // 0 + 1
}                       // → 1 ❌

function handleClick() {
  setCount((c) => c + 1)   // 0 → 1
  setCount((c) => c + 1)   // 1 → 2
  setCount((c) => c + 1)   // 2 → 3
}                          // → 3 ✅
```

**Use `(prev) => ...` whenever the new value depends on the old one**, especially in timers, intervals and async code.

### 5. Updates are batched

**Several `setState` calls in one event produce one re-render** (everywhere, since React 18).

### 6. Same value means no re-render

```jsx
setCount(5)   // if count is already 5 → React skips the re-render (Object.is check)
```

---

## useState gotchas

### 7. Never mutate: create new objects and arrays ⭐

```jsx
// ❌ Same reference → React sees no change → no re-render
user.age = 26; setUser(user)
todos.push(newTodo); setTodos(todos)

// ✅ New reference
setUser({ ...user, age: 26 })
setTodos([...todos, newTodo])
setTodos(todos.filter((t) => t.id !== id))
setTodos(todos.map((t) => (t.id === id ? { ...t, done: true } : t)))
```

### 8. `setState` replaces, it doesn't merge (unlike classes)

```jsx
const [form, setForm] = useState({ name: '', email: '' })
setForm({ name: 'Sam' })                 // ❌ email is gone
setForm({ ...form, name: 'Sam' })        // ✅
```

### 9. Don't store what you can calculate

```jsx
const [items, setItems] = useState([])
const total = items.reduce((sum, i) => sum + i.price, 0)   // ✅ derive it, no extra state
```

### 10. Reset state with a `key`

```jsx
<ProfileForm key={userId} />    // new userId → fresh component, fresh state
```

---

## useEffect basics

### 1. When it runs: after the render is on screen

```
render (calculate JSX) → update DOM → browser paints → useEffect runs
```

**So effects don't block the screen.** (For measuring the DOM **before** the paint, use `useLayoutEffect`.)

### 2. The dependency array: 3 forms ⭐

```jsx
useEffect(() => { ... })              // after EVERY render
useEffect(() => { ... }, [])          // once, after the FIRST render (mount)
useEffect(() => { ... }, [userId])    // first render + whenever userId changes
```

### 3. Dependencies are compared with `Object.is`

```jsx
function Search() {
  const options = { limit: 10 }                   // new object every render
  useEffect(() => { fetchData(options) }, [options])   // ❌ runs EVERY render
}
```

✅ **Fixes:**

- **Use primitives** in the dependency array: `[options.limit]`.
- **Move the object inside the effect.**
- **Wrap it in `useMemo`** (or a function in `useCallback`).

### 4. Effect order: children first

```jsx
function Parent() {
  useEffect(() => console.log('Parent effect'))
  return <Child />
}
function Child() {
  useEffect(() => console.log('Child effect'))
  return null
}
// Render:  Parent → Child
// Effects: Child effect → Parent effect   (children's effects run first)
```

---

## useEffect gotchas

### 1. Infinite loops ⚠️

```jsx
useEffect(() => {
  setCount(count + 1)        // ❌ no deps → render → effect → setState → render → ...
})

useEffect(() => {
  setUser({ ...user })       // ❌ [user] dep + new object each time → loop
}, [user])
```

### 2. You can't make the effect function itself `async`

```jsx
useEffect(async () => { ... }, [])     // ❌ async returns a Promise, but React expects a cleanup function

useEffect(() => {
  async function load() {              // ✅ define it inside, then call it
    const data = await fetchUser(id)
    setUser(data)
  }
  load()
}, [id])
```

### 3. Don't lie about dependencies

**Every value from the component that you use inside the effect should be in the array.** The `react-hooks/exhaustive-deps` lint rule checks this. Missing one gives you **stale values**.

### 4. You might not need an effect

```jsx
// ❌ Effect to compute derived data
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(first + ' ' + last), [first, last])

// ✅ Just calculate during render
const fullName = first + ' ' + last
```

**Effects are for syncing with things outside React** (network, timers, DOM, subscriptions), not for calculations or for responding to clicks. Put those in event handlers.

---

## How cleanup works

### The rule

```jsx
useEffect(() => {
  // SETUP: start something
  return () => {
    // CLEANUP: stop it
  }
}, [deps])
```

**React calls the cleanup:**

1. **Before the effect runs again** (a dependency changed), using the **old** values.
2. **When the component unmounts** (is removed from the page).
3. **In development with StrictMode, once right after mounting** (setup, cleanup, setup), to test that your cleanup works.

### Watch it happen

```jsx
function ChatRoom({ roomId }) {
  useEffect(() => {
    console.log('✅ connect to', roomId)
    return () => console.log('❌ disconnect from', roomId)
  }, [roomId])

  return <h2>Room: {roomId}</h2>
}
```

```
<ChatRoom roomId="general" />   mounted
   ✅ connect to general

roomId changes to "travel"
   ❌ disconnect from general      ← cleanup runs FIRST, with the OLD roomId
   ✅ connect to travel            ← then the new effect

component removed (unmount)
   ❌ disconnect from travel       ← final cleanup

In development (StrictMode) at mount:
   ✅ connect to general
   ❌ disconnect from general      ← React tests your cleanup
   ✅ connect to general
```

**Key point: the cleanup "remembers" the values from its own render.** That's why it disconnects from **"general"**, not "travel". It's a closure.

### Full timeline of one update

```
1. roomId changes → React re-renders the component (new JSX)
2. React updates the DOM, browser paints
3. React runs the OLD effect's cleanup   (disconnect general)
4. React runs the NEW effect             (connect travel)
```

---

## Cleanup examples

### ⏱️ Timer / interval

```jsx
useEffect(() => {
  const id = setInterval(() => setSeconds((s) => s + 1), 1000)
  return () => clearInterval(id)
}, [])
```

**Without cleanup:** the interval keeps running after unmount. In StrictMode you get 2 intervals, and the timer counts double.

### 🖱️ Event listener

```jsx
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth)
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)   // ⚠️ the SAME function
}, [])
```

### 🌐 Fetch: avoid race conditions ⭐

```jsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((err) => {
      if (err.name !== 'AbortError') console.error(err)
    })

  return () => controller.abort()      // userId changed → cancel the old request
}, [userId])
```

**Without cleanup:**

1. **The user clicks user 1, then quickly clicks user 2.**
2. **Request 2 is fast; request 1 is slow.**
3. **Request 1 finishes last and overwrites the screen with user 1.** ❌

**The simpler alternative is an "ignore" flag:**

```jsx
useEffect(() => {
  let ignore = false
  fetchUser(userId).then((data) => {
    if (!ignore) setUser(data)          // only the latest request updates state
  })
  return () => { ignore = true }
}, [userId])
```

### 🔌 WebSocket

```jsx
useEffect(() => {
  const socket = new WebSocket(`wss://chat.example.com/${roomId}`)
  socket.onmessage = (e) => setMessages((m) => [...m, e.data])
  return () => socket.close()
}, [roomId])
```

### 🎯 What needs cleanup?

| Started in the effect | Cleanup |
|---|---|
| `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` |
| `addEventListener` | `removeEventListener` (same function) |
| `fetch` | `controller.abort()` or an ignore flag |
| WebSocket / EventSource | `.close()` |
| `IntersectionObserver` / `ResizeObserver` | `.disconnect()` |
| Library subscription | `unsubscribe()` |

**Without cleanup:** memory leaks, wrong data shown (race conditions), duplicate work (2 intervals, 2 connections), and errors from updating unmounted components.

---

## Quiz

**Q1. What does this log after one click?**

```jsx
const [count, setCount] = useState(0)
const handleClick = () => {
  setCount(count + 1)
  console.log(count)
}
```

**`0`.** State updates on the next render. `count` is a snapshot.

**Q2. `count` after one click?**

```jsx
setCount(count + 5)
setCount((c) => c + 1)
```

**`6`.** The first sets 0 + 5. The functional update then gets 5 and makes 6.

**Q3. Why does this run forever?**

```jsx
useEffect(() => { setData(fetchSomething()) })
```

**No dependency array**, so it runs after every render. `setData` causes a render, which runs the effect again, and so on.

**Q4. When `id` changes from 1 to 2, what's logged?**

```jsx
useEffect(() => {
  console.log('start', id)
  return () => console.log('stop', id)
}, [id])
```

**`stop 1`**, then **`start 2`**. The cleanup runs first, with the old value.

**Q5. Why does my effect run twice on mount in development?**

**StrictMode** deliberately runs setup, cleanup, setup to check that your cleanup works. It doesn't happen in production.

---

## 🎯 Interview answer

> "`useState` stores a value that persists across renders, and calling its setter re-renders the component. The initial value is only used on the first render, so expensive initial values should use a lazy initializer. Updates aren't immediate: state is a snapshot for that render, so I use functional updates like `setCount(c => c + 1)` when the next value depends on the previous one. Updates are batched, setting the same value skips the render, and state must be updated immutably, because React compares by reference; unlike class `setState`, it replaces rather than merges.
>
> `useEffect` runs side effects after the render is painted. With no dependency array it runs after every render, with an empty array only on mount, and with dependencies whenever they change, compared with `Object.is`, so new objects or functions in the dependencies cause re-runs. The effect function can't be async, so I define an async function inside it, and I don't use effects for derived data.
>
> The cleanup is the function returned from the effect. React runs it before the effect runs again with new dependencies, using the old values from its closure, and when the component unmounts. In development, StrictMode runs setup, cleanup, setup to verify it. I use it to clear timers, remove event listeners with the same function reference, close sockets, disconnect observers, and abort fetches or use an ignore flag, which also prevents race conditions where an older, slower response overwrites newer data. Without cleanup, you get memory leaks, duplicate subscriptions and stale data."
