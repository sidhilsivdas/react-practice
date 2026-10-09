## Short answer

**In React, a parent cannot read a child's state directly.** Data flows **down** through props. So the "workarounds" are:

| Way | Idea | When |
|---|---|---|
| **1. Lift state up** ✅ (best) | Move the state into the **parent** and pass it down | The parent needs the **data** |
| **2. Callback prop** | The child **tells** the parent when something changes: `onChange(value)` | The parent needs to **know** about changes |
| **3. `useRef` + `useImperativeHandle`** | The child **exposes methods** the parent can call: `ref.current.reset()` | The parent needs to **trigger an action**: focus, reset, play, open, validate |
| **4. Context / store** | Shared state many components read | Data needed far away |
| **5. `key` to reset** | Change the key, and the child starts fresh | The parent just wants to **reset** the child |

**Analogy: a TV remote** 📺

- **Lifting state up** = **you** decide the channel and tell the TV.
- **`useImperativeHandle`** = the TV gives you a **remote with a few buttons** (Power, Volume+, Mute). You can **press buttons**, but you **can't open the TV** and touch its circuits. The child decides which buttons exist.

---

## useRef recap

```jsx
// A. Access a DOM element
function SearchBox() {
  const inputRef = useRef(null)
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  )
}

// B. Keep a value between renders WITHOUT re-rendering (timer ids, previous values)
const timerRef = useRef(null)
```

**`ref.current` is `null` until the element mounts.** Only use it in **event handlers or effects**, not during render.

### The problem: a ref on a component

```jsx
<input ref={inputRef} />     // ✅ ref → the DOM <input>
<MyInput ref={inputRef} />   // ❓ a component has no DOM node by itself
```

- **React 18:** a function component **can't receive a `ref`** unless it's wrapped in **`forwardRef`**.
- **React 19:** `ref` is a **normal prop**, so you can just accept it.

---

## useImperativeHandle

**What it does:** customises **what the parent gets** in `ref.current`. Instead of the whole DOM node, the child gives back **an object with only the methods it chooses**.

```jsx
useImperativeHandle(ref, () => ({
  // whatever you return here becomes ref.current in the parent
}), [dependencies])
```

### Example: read and reset a child's state (counter)

**Child** (React 19: `ref` as a prop):

```jsx
import { useImperativeHandle, useState } from 'react'

function Counter({ ref }) {
  const [count, setCount] = useState(0)

  useImperativeHandle(ref, () => ({
    getCount: () => count,          // let the parent READ state
    reset: () => setCount(0),       // let the parent CHANGE state
  }), [count])                      // re-create when count changes, so getCount is fresh

  return (
    <div>
      <p>Child count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  )
}
```

**Parent:**

```jsx
import { useRef } from 'react'

function Parent() {
  const counterRef = useRef(null)

  return (
    <>
      <Counter ref={counterRef} />

      <button onClick={() => alert(counterRef.current.getCount())}>
        Read child count
      </button>
      <button onClick={() => counterRef.current.reset()}>
        Reset child
      </button>
    </>
  )
}
```

**The same child in React 18**, using `forwardRef`:

```jsx
import { forwardRef, useImperativeHandle, useState } from 'react'

const Counter = forwardRef(function Counter(props, ref) {
  const [count, setCount] = useState(0)
  useImperativeHandle(ref, () => ({
    getCount: () => count,
    reset: () => setCount(0),
  }), [count])
  return <p>Child count: {count}</p>
})
```

### Step by step

1. **The parent creates `counterRef = useRef(null)`** and passes it: `<Counter ref={counterRef} />`.
2. **After the child mounts, `useImperativeHandle` sets `counterRef.current = { getCount, reset }`.**
3. **The user clicks "Read child count"**, and the parent calls `counterRef.current.getCount()`, which returns the child's `count`.
4. **The user clicks "Reset child"**, and the parent calls `counterRef.current.reset()`, which runs `setCount(0)` **inside the child**, and the child re-renders.
5. **When `count` changes**, the `[count]` dependency makes React rebuild the object, so `getCount` always returns the latest value.

---

## Custom input example

**Exposing only focus, clear and getValue** (the most common interview example):

```jsx
import { useImperativeHandle, useRef } from 'react'

function FancyInput({ ref, ...props }) {
  const inputRef = useRef(null)          // the child's OWN ref to the real <input>

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = '' },
    getValue: () => inputRef.current.value,
  }), [])

  return <input ref={inputRef} {...props} />
}

function LoginForm() {
  const emailRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    const email = emailRef.current.getValue()
    if (!email) {
      emailRef.current.focus()            // jump to the empty field
      return
    }
    alert(`Logging in ${email}`)
    emailRef.current.clear()
  }

  return (
    <form onSubmit={handleSubmit}>
      <FancyInput ref={emailRef} placeholder="Email" />
      <button>Login</button>
    </form>
  )
}
```

**Why not just pass the ref straight to `<input>`?** Then the parent gets the **whole DOM node** and could change anything: styles, value, remove it. **`useImperativeHandle` limits it to a small, safe API** (encapsulation).

### More real-world uses

```jsx
// 🎬 Video player
useImperativeHandle(ref, () => ({
  play: () => videoRef.current.play(),
  pause: () => videoRef.current.pause(),
}), [])
// parent: playerRef.current.play()

// 🪟 Modal
useImperativeHandle(ref, () => ({
  open: () => setIsOpen(true),
  close: () => setIsOpen(false),
}), [])
// parent: modalRef.current.open()

// 📝 Form validation
useImperativeHandle(ref, () => ({
  validate: () => {
    const ok = value.trim() !== ''
    setError(ok ? '' : 'Required')
    return ok
  },
}), [value])
// parent: if (fieldRef.current.validate()) submit()
```

---

## The ref trap

**Refs don't re-render the parent:**

```jsx
function Parent() {
  const counterRef = useRef(null)
  return (
    <>
      <Counter ref={counterRef} />
      <p>Parent sees: {counterRef.current?.getCount()}</p>   {/* ❌ stale / undefined */}
    </>
  )
}
```

**Why it fails:**

- **The child's state changing re-renders the child only**, not the parent.
- **On the first render, `counterRef.current` is still `null`.**

So **a ref is for calling methods on demand** (in clicks and effects), **not for showing child data** in the parent's UI.

---

## Better workarounds

### Callback prop

```jsx
function Counter({ onChange }) {
  const [count, setCount] = useState(0)

  function increment() {
    const next = count + 1
    setCount(next)
    onChange?.(next)                  // tell the parent in the event handler
  }

  return <button onClick={increment}>Child: {count}</button>
}

function Parent() {
  const [childCount, setChildCount] = useState(0)
  return (
    <>
      <Counter onChange={setChildCount} />
      <p>Parent sees: {childCount}</p>     {/* ✅ updates */}
    </>
  )
}
```

### Best: lift the state up

```jsx
function Parent() {
  const [count, setCount] = useState(0)          // state lives in the parent
  return (
    <>
      <Counter count={count} onIncrement={() => setCount((c) => c + 1)} />
      <p>Parent sees: {count}</p>
      <button onClick={() => setCount(0)}>Reset</button>   {/* no ref needed */}
    </>
  )
}

function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>Child: {count}</button>
}
```

### Just want to reset the child? Use a `key`

```jsx
const [formKey, setFormKey] = useState(0)
<SignupForm key={formKey} />
<button onClick={() => setFormKey((k) => k + 1)}>Reset form</button>   // fresh child, fresh state
```

### Which one to use?

| Need | Use |
|---|---|
| Parent **shows or uses** the child's data | **Lift state up** |
| Parent wants to **react** when the child changes | **Callback prop** (`onChange`) |
| Parent wants to **trigger** focus, scroll, play, open, validate | **`useRef` + `useImperativeHandle`** |
| Parent wants to **reset** the child | **`key`** |
| Many distant components share it | **Context / Redux / Zustand** |

**Rule:** **"Props for data, refs for actions."** Use `useImperativeHandle` **sparingly**. React's docs call it an escape hatch.

---

## Quick Q&A

**Q: Can a parent access a child's state directly?**
No. Data flows down. Lift the state up, use callbacks, or expose methods with `useImperativeHandle`.

**Q: What does `useImperativeHandle` do?**
It customises the value the parent gets in `ref.current`, exposing only selected methods instead of the whole DOM node.

**Q: Is `forwardRef` still needed?**
In **React 18, yes**. In **React 19, no**: `ref` is a normal prop. `forwardRef` still works but is being phased out.

**Q: Why the dependency array in `useImperativeHandle`?**
The exposed methods are closures. If they use state, list it as a dependency so the handle is rebuilt and the methods don't return **stale values**.

**Q: Why is `ref.current` null on the first render?**
React sets refs **after** mounting the DOM, during the commit. Access them in effects or event handlers.

**Q: Downsides of `useImperativeHandle`?**
It breaks React's one-way, declarative data flow, changes aren't reactive (the parent doesn't re-render), and logic is harder to follow and test. Use it only for imperative actions.

**Q: Declarative vs imperative?**
**Declarative** = "here's the state, React updates the UI": `<Modal isOpen={open} />`. **Imperative** = "do this now": `modalRef.current.open()`. React prefers declarative; imperative is for things like focus, scrolling and media playback.

---

## 🎯 Interview answer

> "A parent can't read a child's state directly because data flows one way, so the main workaround is lifting state up: the parent owns the state and passes it down with a setter. If the parent only needs to know about changes, the child can call a callback prop like `onChange`. When the parent needs to trigger an action in the child, like focusing an input, playing a video, opening a modal or validating a field, I use a ref with `useImperativeHandle`. The parent creates a ref with `useRef` and passes it to the child, and in React 18 the child is wrapped in `forwardRef`, while in React 19 `ref` is just a prop. Inside the child, `useImperativeHandle(ref, () => ({ focus, reset, getValue }), [deps])` sets `ref.current` to an object with only the methods I choose, which keeps the child encapsulated instead of exposing the whole DOM node, and the dependency array keeps those closures up to date. The caveat is that refs aren't reactive: the parent doesn't re-render when the child's state changes, and `ref.current` is null until mount, so I only use it in event handlers or effects, never to display child data. It's an escape hatch: props for data, refs for actions. And to simply reset a child, changing its `key` is cleaner."
