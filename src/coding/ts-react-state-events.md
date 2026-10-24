## Problem

This todo app is plain JavaScript pasted into a `.tsx` file, and it has **several type errors**. Fix them all without using `any`:

1. `todos` should be a list of `Todo`
2. `selected` is a `Todo`, or `null` when nothing is selected
3. `handleChange` handles an `<input>` change event
4. `handleSubmit` handles a `<form>` submit event
5. `toggle` takes a todo's `id`

Click **▶ Run tests** first and read the errors. Each one points at a line to fix.

## Examples

```tsx
const [count, setCount] = useState(0)                // inferred: number
const [todos, setTodos] = useState([])               // ❌ inferred: never[] (an empty array of nothing)
const [user, setUser] = useState(null)               // ❌ inferred: null, so setUser(someone) fails
```

## Hints

1. `useState` infers the type from the initial value. When the initial value doesn't tell the whole story (`[]`, `null`), pass the type: `useState<Type>(initial)`.
2. "A Todo or nothing" is `Todo | null`.
3. React's event types take the **element** as a generic: `ChangeEvent<HTMLInputElement>`, `FormEvent<HTMLFormElement>`. Import them from `'react'`.
4. Not sure of an event type? In a real editor, write the handler inline (`onChange={(e) => ...}`) and hover over `e`.

<!-- SOLUTION -->

## Solution

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react'

type Todo = { id: number; text: string; done: boolean }

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [text, setText] = useState('')                       // string is inferred
  const [selected, setSelected] = useState<Todo | null>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setText(e.target.value)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTodos([...todos, { id: Date.now(), text, done: false }])
    setText('')
  }

  function toggle(id: number) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={handleChange} />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} onClick={() => setSelected(todo)} onDoubleClick={() => toggle(todo.id)}>
            {todo.done ? '✅' : '⬜'} {todo.text}
          </li>
        ))}
      </ul>
      {selected && <p>Selected: {selected.text}</p>}
    </form>
  )
}
```

## useState typing rules

| Initial value | Write | Why |
|---|---|---|
| `0`, `''`, `false` | `useState(0)` | Inference is enough |
| `[]` | `useState<Todo[]>([])` | `[]` alone is `never[]` |
| `null` (loaded later) | `useState<User \| null>(null)` | Otherwise it's stuck as `null` |
| An object | `useState<Form>({ ... })` or just infer | Pass the type if some fields are optional |

With `User | null`, TypeScript **makes you check** before reading: `selected.text` is an error, `selected?.text` or `selected && ...` is fine. That's the point: no more "cannot read properties of null".

## Common event types

| Event | Type |
|---|---|
| Input / textarea / select change | `ChangeEvent<HTMLInputElement>` (or `HTMLTextAreaElement`, `HTMLSelectElement`) |
| Form submit | `FormEvent<HTMLFormElement>` |
| Click | `MouseEvent<HTMLButtonElement>` |
| Key press | `KeyboardEvent<HTMLInputElement>` |
| A whole handler | `ChangeEventHandler<HTMLInputElement>` = `(e: ChangeEvent<HTMLInputElement>) => void` |

Inline handlers (`onChange={(e) => setText(e.target.value)}`) need **no** annotation: TypeScript infers `e` from the `onChange` prop.

## 🎯 Interview answer

> "`useState` infers its type from the initial value, which works for primitives. For an empty array or `null` I pass the type explicitly, like `useState<Todo[]>([])` or `useState<User | null>(null)`, and then TypeScript forces me to handle the null case. For event handlers declared separately I use React's event types with the element as the generic, like `ChangeEvent<HTMLInputElement>` or `FormEvent<HTMLFormElement>`. Inline handlers don't need annotations because the event type is inferred from the prop."
