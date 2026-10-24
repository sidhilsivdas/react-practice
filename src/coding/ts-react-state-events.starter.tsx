import { useState } from 'react'

type Todo = { id: number; text: string; done: boolean }

// Fix every type error. Don't use `any`.
function TodoApp() {
  const [todos, setTodos] = useState([])          // 1. a list of Todo
  const [text, setText] = useState('')
  const [selected, setSelected] = useState(null)  // 2. a Todo, or null when none is selected

  function handleChange(e) {                       // 3. an <input> change event
    setText(e.target.value)
  }

  function handleSubmit(e) {                       // 4. a <form> submit event
    e.preventDefault()
    setTodos([...todos, { id: Date.now(), text, done: false }])
    setText('')
  }

  function toggle(id) {                            // 5. a Todo's id
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
