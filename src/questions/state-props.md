## Short answer

| | **Props** | **State** |
|---|---|---|
| What | Data **passed in** from the parent | Data the component **owns** |
| Who changes it | Only the **parent** | The component itself (`setState`) |
| Inside the component | **Read-only** | Read and update |
| Change causes a re-render? | ✅ (when the parent re-renders with new props) | ✅ |
| Analogy | **Function arguments** | **Variables inside the function** that React remembers |

**Analogy: a TV** 📺

- **Props** = the **channel the remote sends**. The TV can't choose it; the remote (parent) decides.
- **State** = the TV's **own volume setting**. The TV controls it itself.

---

## Props

```jsx
function App() {
  return <Greeting name="Sam" age={25} />      // parent passes props
}

function Greeting({ name, age = 18 }) {        // destructure + default value
  return <p>Hello {name}, you are {age}</p>
}
```

**Rules:**

- **Props are read-only.** `props.name = 'X'` ❌ is never allowed.
- **Data flows one way**: parent to child.
- **A child talks to its parent by calling a function prop:**

```jsx
function Parent() {
  const [count, setCount] = useState(0)
  return <Child count={count} onIncrement={() => setCount(count + 1)} />
}

function Child({ count, onIncrement }) {
  return <button onClick={onIncrement}>Count: {count}</button>   // child "asks" the parent
}
```

- **`children` is a special prop** holding whatever you put between the tags:

```jsx
<Card><h2>Title</h2></Card>

function Card({ children }) {
  return <div className="card">{children}</div>
}
```

---

## State

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <>
      <p>{count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+</button>   {/* functional update */}
    </>
  )
}
```

**Rules:**

- **Updating state re-renders the component.**
- **Updates are batched and asynchronous.** `count` doesn't change until the next render.
- **Use the functional update `(c) => c + 1`** when the new value depends on the old one.
- **Never mutate.** Create new objects and arrays: `setUser({ ...user, age: 26 })`.
- **Don't store what you can calculate:**

```jsx
// ❌ Extra state that can get out of sync
const [items, setItems] = useState([])
const [total, setTotal] = useState(0)

// ✅ Derive it during render
const total = items.reduce((sum, i) => sum + i.price, 0)
```

---

## Where state lives

```
Used by one component?          → useState in that component
Shared by siblings?             → lift it up to their common parent
Needed by many, far apart?      → Context
Large app, frequent updates?    → Redux Toolkit / Zustand
Server data (API)?              → TanStack Query / RTK Query
Should survive refresh / share? → URL (?search=...) or localStorage
```

**Rule of thumb: keep state as low as possible**, and lift it only when needed.

---

## Controlled components

**Controlled: React holds the value.**

```jsx
function ControlledForm() {
  const [name, setName] = useState('')

  return (
    <form onSubmit={(e) => { e.preventDefault(); alert(name) }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <p>Live preview: {name}</p>
      <button disabled={!name}>Submit</button>
    </form>
  )
}
```

**Every keystroke updates state, and state drives the input.** React is the **single source of truth**.

### ⚠️ Common warning

```jsx
const [name, setName] = useState()          // undefined
<input value={name} onChange={...} />
// ⚠️ "A component is changing an uncontrolled input to be controlled"
```

**`value={undefined}` makes the input uncontrolled.** When it later becomes a string, React warns. ✅ **Fix:** `useState('')`.

```jsx
<input value={name} />   // ❌ no onChange → read-only input (React warns)
```

---

## Uncontrolled components

**Uncontrolled: the DOM holds the value.**

```jsx
function UncontrolledForm() {
  const inputRef = useRef(null)

  return (
    <form onSubmit={(e) => { e.preventDefault(); alert(inputRef.current.value) }}>
      <input ref={inputRef} defaultValue="" />      {/* defaultValue, NOT value */}
      <button>Submit</button>
    </form>
  )
}
```

**Or read every field at once with `FormData`, with no refs at all:**

```jsx
function SignupForm() {
  function handleSubmit(e) {
    e.preventDefault()
    const data = new FormData(e.target)
    console.log(data.get('email'), data.get('password'))
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" />
      <input name="password" type="password" />
      <button>Sign up</button>
    </form>
  )
}
```

**Analogy:**

- **Controlled** = a **teacher dictating** 👩‍🏫: every word you write is checked as you go.
- **Uncontrolled** = an **exam paper** 📝: you write freely, and it's read only when you hand it in.

---

## Controlled vs uncontrolled

| | **Controlled** | **Uncontrolled** |
|---|---|---|
| Value lives in | React state | The DOM |
| Prop used | `value` + `onChange` | `defaultValue` + `ref` / `FormData` |
| Re-render per keystroke | ✅ yes | ❌ no |
| Live validation, formatting, preview | ✅ easy | ❌ harder |
| Disable the button until valid | ✅ easy | ❌ harder |
| Reset or set the value from code | ✅ `setName('')` | via the ref |
| Code | more | less |
| Performance on huge forms | many re-renders | ✅ fast |
| Best for | most forms, search boxes, dependent fields | simple forms, **file inputs**, React 19 form actions |

**Good to know:**

- **`<input type="file">` is always uncontrolled.** Its value can't be set from code.
- **React 19's `<form action={fn}>` works naturally with uncontrolled inputs and `FormData`.**
- **The form library React Hook Form uses uncontrolled inputs** internally, for speed.

---

## Prop drilling

**Prop drilling is passing props through components that don't use them**, just so a deeply nested child can get them.

```
App           (user lives here)
 └─ Layout     user → passes down 😐 (doesn't use it)
     └─ Sidebar   user → passes down 😐 (doesn't use it)
         └─ Profile   user → passes down 😐 (doesn't use it)
             └─ Avatar   ✅ finally uses user
```

```jsx
function App() {
  const [user] = useState({ name: 'Sam' })
  return <Layout user={user} />
}
const Layout = ({ user }) => <Sidebar user={user} />
const Sidebar = ({ user }) => <Profile user={user} />
const Profile = ({ user }) => <Avatar user={user} />
const Avatar = ({ user }) => <p>👤 {user.name}</p>
```

**Why it's a problem:**

- **Middle components get props they don't care about**, which adds noise.
- **Renaming or adding a prop means editing every level.**
- **Middle components are harder to reuse**, because they now depend on `user`.
- **Every middle component re-renders** when `user` changes.

> **A note:** passing props **2–3 levels** is completely fine and normal. It becomes a problem when it's deep or happens everywhere.

---

## Preventing prop drilling

### 1. Component composition (`children`) ⭐ (often the best, and simplest)

**Pass the finished component down, instead of the data:**

```jsx
function App() {
  const [user] = useState({ name: 'Sam' })

  return (
    <Layout>
      <Sidebar>
        <Avatar user={user} />        {/* App passes user DIRECTLY to Avatar */}
      </Sidebar>
    </Layout>
  )
}

const Layout = ({ children }) => <div className="layout">{children}</div>
const Sidebar = ({ children }) => <aside>{children}</aside>
const Avatar = ({ user }) => <p>👤 {user.name}</p>
```

**`Layout` and `Sidebar` never see `user`.** There's no drilling and no extra tools.

### 2. Context API

**For data needed in many places** (logged-in user, theme, language):

```jsx
import { createContext, useContext, useState } from 'react'

// 1. Create
const UserContext = createContext(null)

// 2. Provide (wrap the tree)
function App() {
  const [user, setUser] = useState({ name: 'Sam' })
  return (
    <UserContext.Provider value={{ user, setUser }}>   {/* React 19: <UserContext value={...}> */}
      <Layout />
    </UserContext.Provider>
  )
}

// 3. Middle components: no props!
const Layout = () => <Sidebar />
const Sidebar = () => <Profile />
const Profile = () => <Avatar />

// 4. Consume anywhere
function Avatar() {
  const { user } = useContext(UserContext)
  return <p>👤 {user.name}</p>
}
```

**A tidy pattern:** `export const useUser = () => useContext(UserContext)`, then `const { user } = useUser()` in components.

**Context pitfalls:**

- **Every component using the context re-renders when its `value` changes.**
- **Split contexts by purpose** (`UserContext`, `ThemeContext`) instead of one giant context.
- **Context is for passing data.** It isn't a full state manager with DevTools or middleware.

### 3. A state management library

**For large apps with lots of shared, frequently changing state:** Redux Toolkit or Zustand.

```jsx
// Zustand: tiny and simple
import { create } from 'zustand'

const useUserStore = create((set) => ({
  user: { name: 'Sam' },
  setUser: (user) => set({ user }),
}))

function Avatar() {
  const user = useUserStore((state) => state.user)    // only re-renders when user changes
  return <p>👤 {user.name}</p>
}
```

### Other options

- **URL state** for filters, search and pagination (`?search=react`): shareable and survives a refresh.
- **Server-state libraries** (TanStack Query): any component can call `useQuery(['user'])` and get the **cached** data, with no passing needed.

### Which one to choose?

| Situation | Use |
|---|---|
| Only 2–3 levels | ✅ just pass props |
| Middle components only **wrap** content | **Composition (`children`)** |
| App-wide, rarely changes (theme, user, language) | **Context** |
| Large app, frequent shared updates | **Redux Toolkit / Zustand** |
| Data from an API | **TanStack Query / RTK Query** |

---

## Quick Q&A

**Q: Can a child change its props?**
No. Props are read-only. The child calls a function prop, and the **parent** updates its state.

**Q: Why is `setState` "async"?**
React **batches** updates and applies them on the next render, for performance. Read the new value on the next render, or use a functional update.

**Q: When do you use uncontrolled inputs?**
Simple forms where you only need the values on submit, file inputs, integrating non-React libraries, React 19 form actions, and big forms where you care about performance.

**Q: What is "lifting state up"?**
Moving shared state to the **closest common parent**, so siblings can share it through props.

**Q: Is Context a replacement for Redux?**
For **simple, rarely changing** global data, yes. For **complex, frequently updated** state, Redux or Zustand handle performance better (selective re-renders, DevTools, middleware).

**Q: What's the simplest fix for prop drilling?**
Often **component composition**, passing components as `children`, before reaching for Context.

---

## 🎯 Interview answer

> "Props are read-only inputs a component receives from its parent, and data flows one way, from parent to child; a child communicates back by calling a function prop. State is data a component owns and updates with `setState`, which triggers a re-render. I keep state as low as possible, lift it up when siblings share it, and derive values during render instead of storing duplicates. A controlled component's value lives in React state through `value` and `onChange`, so React is the single source of truth: that's great for validation, formatting and enabling buttons, at the cost of a re-render per keystroke. An uncontrolled component keeps the value in the DOM, using `defaultValue` and reading it with a ref or `FormData` on submit: less code and fewer renders, which suits simple forms, file inputs and React 19 form actions. Prop drilling is passing props through intermediate components that don't use them just to reach a deep child, which makes code noisy and harder to change. To avoid it, I first try component composition, passing components as `children`; for app-wide data like the user or theme I use Context, ideally split by concern; and for large, frequently changing shared state I use Redux Toolkit or Zustand, or a query library for server data."
