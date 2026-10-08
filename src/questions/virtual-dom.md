## Short answer

React never edits the page directly while your component runs. Your component returns a **description** of what the UI should look like. React compares it with the **previous** description and makes the smallest set of real page changes.

---

## What it is

JSX is just syntax for building **plain JavaScript objects**:

```jsx
<p className="mt-4">Seconds: {seconds}</p>
```

becomes:

```js
{
  type: 'p',
  props: { className: 'mt-4', children: ['Seconds: ', 5] },
  key: null
}
```

- **Each object is a "React element".** A tree of them is what people call the **Virtual DOM**.
- **Creating objects is very cheap.** Touching the real DOM is slow, because the browser may recalculate layout and repaint.

> **The idea:** do the comparison work on cheap objects, then touch the real DOM as little as possible.

---

## Render → commit

```
setSeconds(s => s + 1)
      │
      ▼
① Schedule an update (several setState calls are batched into one re-render)
      │
      ▼
② RENDER PHASE: call the component again → new element tree
      │
      ▼
③ RECONCILIATION: diff the new tree against the previous one
      │
      ▼
④ COMMIT PHASE: apply only the changes to the real DOM
      │
      ▼
⑤ Run effects (useEffect), browser paints
```

- **Render phase:** pure calculation, with nothing visible on the page. React can pause, restart or throw it away.
- **Commit phase:** writes to the real DOM, all at once. The user never sees a half-updated screen.

That's why components must be **pure**. React may call them more than once.

---

## Diffing rules

A perfect tree diff costs **O(n³)**. React makes it **O(n)** using two assumptions:

1. **Elements of different types produce different trees.**
2. **`key` tells React which list items are the same between renders.**

### Rule 1: Different type, so throw away and rebuild

```jsx
<div><Timer /></div>   →   <section><Timer /></section>
```

React unmounts the whole old subtree. **`Timer` loses its state** and its cleanup runs.

### Rule 2: Same DOM type, so keep the node and update only the changed attributes

```jsx
<button className="bg-red-500" />  →  <button className="bg-green-500" />
```

Same real `<button>`. Only `className` is updated.

### Rule 3: Same component type, so keep its state and re-render with new props

```jsx
<Message text="hi" />  →  <Message text="hello" />
```

### Rule 4: Lists need keys

Without keys, React compares children **by position**. Adding an item at the top makes React rewrite every item, and any state stays attached to the wrong item.

```jsx
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

- ✅ **Use stable, unique keys**, such as a database ID.
- ❌ **Don't use the array index** if the list can be reordered or filtered.
- ❌ **Never use `Math.random()`.** Every item would remount on every render.
- 💡 **Changing a key on purpose resets a component:** `<Timer key={userId} />`.

---

## Misconceptions

1. **"The Virtual DOM is faster than plain JS."** It's *fast enough*, while letting you write simple "describe the UI" code.
2. **"A re-render means the DOM updated."** No. It only means your function ran. The DOM changes only if the diff finds differences.
3. **"React compares against the real DOM."** No. It compares against its **previous tree**.

---

## 🎯 Interview answer

> "React keeps a lightweight tree of JavaScript objects describing the UI. When state changes, it re-runs the component to build a new tree and diffs it against the previous one in O(n), using two heuristics: elements of a different type are replaced entirely, and keys identify list items across renders. Same-type elements are kept and only their changed attributes are updated; same-type components keep their state. Then, in the commit phase, React applies only the minimal changes to the real DOM."
