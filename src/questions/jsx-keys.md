## Short answer

- **JSX** is **HTML-like syntax inside JavaScript**. It isn't HTML: it **compiles to JavaScript function calls** that create React elements.
- **Keys** are **unique IDs for list items**. They tell React **which item is which** between renders, so React can **reuse, move or remove** the right DOM elements instead of rebuilding them. Good keys mean **faster updates and no state mix-ups**.

**Analogy: a classroom** 🏫

- **Without keys**, the teacher identifies students **by seat number**. If a new student sits in seat 1, everyone "shifts", and the teacher thinks every student changed.
- **With keys**, the teacher knows students **by roll number**. A new student joins, everyone else is still the same person, and only one new name gets added.

---

## What JSX compiles to

```jsx
// You write:
const element = <h1 className="title">Hello {name}</h1>

// Compiler (Babel / Vite) turns it into (React 17+):
import { jsx as _jsx } from 'react/jsx-runtime'
const element = _jsx('h1', { className: 'title', children: ['Hello ', name] })

// Older React (still valid):
const element = React.createElement('h1', { className: 'title' }, 'Hello ', name)

// Result: a plain JavaScript object
{ type: 'h1', props: { className: 'title', children: ['Hello ', 'Sam'] }, key: null }
```

**JSX is just a nicer way to write `createElement` calls.** The result is a **plain object** (part of the Virtual DOM). **Browsers don't understand JSX**, so Babel, Vite or TypeScript compile it first.

---

## JSX rules

```jsx
function Profile({ user, isAdmin }) {
  return (
    <>                                              {/* 1. One root → use a Fragment <></> */}
      <h1 className="name">{user.name}</h1>          {/* 2. className, not class */}
      <label htmlFor="email">Email</label>           {/* 3. htmlFor, not for */}
      <input id="email" onChange={handleChange} />   {/* 4. camelCase events; close every tag */}
      <img src={user.photo} alt="" />                {/* 5. self-closing tags need / */}
      <p style={{ color: 'red', fontSize: 14 }}>     {/* 6. style is an OBJECT, camelCase */}
        {user.age + 1}                               {/* 7. {} for any JS expression */}
      </p>
      {isAdmin && <button>Delete</button>}           {/* 8. conditional rendering */}
      {/* 9. comments look like this */}
    </>
  )
}
```

| HTML | JSX |
|---|---|
| `class="x"` | `className="x"` |
| `for="x"` | `htmlFor="x"` |
| `onclick="..."` | `onClick={fn}` |
| `style="color: red"` | `style={{ color: 'red' }}` |
| `<br>` | `<br />` |
| `tabindex` | `tabIndex` |

### Expressions only, not statements

```jsx
{user.name}                          // ✅ expression
{isLoggedIn ? 'Hi' : 'Login'}        // ✅ ternary
{items.map((i) => <li>{i}</li>)}     // ✅ map returns an array

{if (isLoggedIn) { ... }}            // ❌ statements not allowed
{for (...) { ... }}                  // ❌ use .map instead
```

### Conditional rendering

```jsx
{isLoading && <Spinner />}                        // show or nothing
{isLoggedIn ? <Dashboard /> : <Login />}          // either / or
{count > 0 && <p>{count} items</p>}               // ⚠️ not {count && ...}: 0 would render "0"
```

### What JSX renders

| Value | Renders |
|---|---|
| strings, numbers | ✅ shown (including `0`!) |
| `true`, `false`, `null`, `undefined` | nothing |
| arrays | each item |
| objects `{ a: 1 }` | ❌ **error**: "Objects are not valid as a React child" |

**Security bonus:** JSX **escapes values automatically**, so `{userInput}` is shown as text, never run as HTML. That's why React is safe from most XSS.

---

## Why keys matter

When a list re-renders, React compares the **old list** with the **new list** (reconciliation) and asks: "Which items are the same? Which are new? Which were removed or moved?"

- **Without keys** (or with index keys), React matches items **by position**.
- **With proper keys**, React matches items **by identity**.

```jsx
{todos.map((todo) => (
  <li key={todo.id}>{todo.text}</li>       // ✅ stable, unique ID
))}
```

---

## Keys & performance

**Adding an item at the top:**

```
Old list:            New list (added "A" at top):
  B                    A
  C                    B
  D                    C
                       D
```

**❌ With index keys (`key={index}`):**

```
key=0: "B" → "A"   ✏️ update text
key=1: "C" → "B"   ✏️ update text
key=2: "D" → "C"   ✏️ update text
key=3: new  "D"    ➕ create
→ 3 updates + 1 insert. For 1,000 items: 1,000 updates! 🐢
```

**✅ With ID keys (`key={item.id}`):**

```
key=a: new         ➕ insert at top
key=b: same        ✅ untouched (maybe moved)
key=c: same        ✅ untouched
key=d: same        ✅ untouched
→ just 1 insert, however long the list is 🚀
```

**This is the performance win.** React **re-uses existing DOM nodes** and only does the minimum work.

### Index keys cancel `memo`

```jsx
const TodoItem = memo(function TodoItem({ todo }) { ... })

{todos.map((todo, index) => <TodoItem key={index} todo={todo} />)}
```

When you add an item at the top, **position 0 now holds a different todo**, so its props changed and **every memoized item re-renders**. With `key={todo.id}`, each `TodoItem` keeps its own todo, so `memo` skips them.

---

## Index key bug

**The bigger problem with index keys: state gets attached to the wrong item.** 😱

```jsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React' },
    { id: 2, text: 'Learn Redux' },
  ])

  const addToTop = () => setTodos([{ id: Date.now(), text: 'New task' }, ...todos])

  return (
    <>
      <button onClick={addToTop}>Add to top</button>
      {todos.map((todo, index) => (
        <div key={index}>                    {/* ❌ index key */}
          {todo.text} <input placeholder="note" />
        </div>
      ))}
    </>
  )
}
```

**What happens:**

1. **Type "urgent" in the input next to "Learn React".**
2. **Click "Add to top".**
3. **"urgent" is now next to "New task"!** ❌

**Why:** the input's text is **DOM/component state attached to key=0**. Key 0 now shows "New task", so the note stays at **position 0**.

✅ **With `key={todo.id}`**, the input stays with "Learn React".

**The same bug affects:** checkboxes, focus, animations, and any `useState` inside list items.

---

## Choosing keys

| Key | Good? | Why |
|---|---|---|
| `item.id` from the database | ✅ **best** | stable and unique |
| a unique field (email, slug) | ✅ | stable and unique |
| `crypto.randomUUID()` **when the item is created**, then stored | ✅ | generated once, kept forever |
| `index` | ⚠️ **only if** the list never reorders, filters or inserts | otherwise causes the bugs above |
| `Math.random()` / `Date.now()` **in render** | ❌ **worst** | a new key every render, so React **destroys and recreates every item** every time |

### Key rules

```jsx
// 1. Keys only need to be unique among SIBLINGS (not globally)
<ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
<ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>   // same ids are OK here

// 2. Key goes on the OUTERMOST element returned by map
{users.map((u) => (
  <UserCard key={u.id} user={u} />        // ✅ here, not inside UserCard
))}

// 3. Fragments with keys: use <Fragment>, not <>
import { Fragment } from 'react'
{items.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.description}</dd>
  </Fragment>
))}

// 4. key is NOT passed as a prop
function UserCard({ key }) { }            // ❌ undefined, so pass id separately if needed
```

### Bonus: use a key to reset a component

**Changing a key tells React it's a different component**, so React **throws away the old one and its state**, and mounts a fresh one:

```jsx
<ProfileForm key={userId} userId={userId} />
```

**Switch from user 1 to user 2**, and the form **resets completely**, with no `useEffect` needed to clear the fields.

---

## Quick Q&A

**Q: What is JSX? Do browsers understand it?**
Syntax that compiles to `jsx()` / `React.createElement()` calls producing plain objects. **Browsers don't understand it.** Babel, Vite or TypeScript compile it first.

**Q: Why `className` instead of `class`?**
`class` is a reserved word in JavaScript, and JSX props follow DOM property names (`element.className`).

**Q: Why must JSX return one root element?**
A function can only return **one value**. Wrap several elements in a `<div>` or a Fragment `<></>`.

**Q: Why are keys important?**
They give list items a **stable identity**, so React can match old and new items. It updates only what changed, re-uses DOM nodes when items move, and keeps each item's state with the right item.

**Q: Why is the index a bad key?**
When items are added, removed or reordered, the index points to a **different item**. React then updates every item unnecessarily, and **component state ends up attached to the wrong item**.

**Q: When is the index OK?**
When the list is **static**: never reordered, filtered or inserted into, and the items have no state.

**Q: What happens with `Math.random()` keys?**
Every render produces new keys, so React **unmounts and remounts every item**. That's the slowest option, and it loses all state.

**Q: Can I access `key` inside the component?**
No. `key` is used by React only. Pass the ID as a separate prop if the component needs it.

---

## 🎯 Interview answer

> "JSX is a syntax extension that lets us write HTML-like markup in JavaScript. Browsers don't understand it, so Babel or Vite compile it to `jsx()` or `React.createElement()` calls that return plain objects describing the UI. It has a few rules: one root element or a Fragment, `className` and `htmlFor`, camelCase event handlers, style as an object, and curly braces for expressions, not statements. It also escapes values automatically, which prevents most XSS.
>
> Keys give list items a stable identity during reconciliation. With a stable key like a database ID, React can match old and new items, so adding an item at the top is a single insert and the existing DOM nodes are reused, and memoized items aren't re-rendered. With index keys, every item's position changes, so React updates every item, and worse, component state like an input's text stays attached to the position rather than the item, so it ends up next to the wrong item. Random keys are the worst, because every render remounts every item. Keys only need to be unique among siblings, go on the outermost element in the map, and aren't passed as props. And changing a key on purpose, like `key={userId}`, is a clean way to reset a component's state."
