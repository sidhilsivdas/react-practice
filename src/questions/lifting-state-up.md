## Short answer

- **Data flows down** from parent to child through **props**.
- **Data goes up** from child to parent by calling a **function prop** the parent passed down.
- **Siblings can't talk directly.** Shared state lives in their **common parent**. This is called **lifting state up**.

---

## Example

Three components: `InputBox` (text box + submit), `Message` (shows the value), and their parent `MessageForm`.

```
InputBox  ──onSubmit(input)──▶  MessageForm  ──text──▶  Message
 (child)        up              (parent)       down     (child)
```

### Parent: owns the shared state

```jsx
function MessageForm() {
  const [submitted, setSubmitted] = useState('')

  return (
    <div>
      <InputBox onSubmit={setSubmitted} />   {/* function down */}
      <Message text={submitted} />           {/* value down */}
    </div>
  )
}
```

### Child 1: owns its own typing state, sends the value up

```jsx
function InputBox({ onSubmit }) {
  const [input, setInput] = useState('')

  function handleSubmit(e) {
    e.preventDefault()      // stop the page reload
    onSubmit(input)         // send up to the parent
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button type="submit">Submit</button>
    </form>
  )
}
```

### Child 2: just displays the prop

```jsx
function Message({ text }) {
  return <p>Child received: {text}</p>
}
```

---

## Step by step

1. **Typing** updates `InputBox`'s own state. **Only `InputBox` re-renders.**
2. **Submit** calls `onSubmit(input)`, which is really the parent's `setSubmitted`.
3. **The parent's state changes**, so the parent re-renders.
4. **`Message` gets the new `text` prop** and shows it.

---

## Key concepts

- **Props are read-only.** A child can't change them directly.
- **Name function props `onSomething`** by convention (`onSubmit`, `onChange`).
- **Keep state where it's used.** Typing state stays in `InputBox`, and only the shared value is lifted.
- **Controlled input:** the `value` comes from state and `onChange` updates it, so React is the "single source of truth".
- **`e.preventDefault()`** stops the browser reloading the page on form submit.
- **`setState` functions are stable**, so passing `setSubmitted` directly is fine.

---

## Prop drilling

If you're passing props through many levels that don't use them (**prop drilling**), consider:
- **Context** (`useContext`), for app-wide data like theme or the logged-in user.
- **A state library** like Zustand or Redux.

---

## 🎯 Interview answer

> "In React, data flows one way, from parent to child through props. When two sibling components need the same data, we lift the state up to their closest common parent. The parent owns the state and passes the value down to the component that displays it, and passes a callback down to the component that changes it. The child calls that callback, which updates the parent's state, and React re-renders both children with the new data. I keep state as low as possible: for example, the input's typing state stays local, and only the submitted value is lifted. If lifting leads to heavy prop drilling, I'd use Context or a state library."
