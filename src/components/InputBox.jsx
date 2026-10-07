import { useState } from 'react'

function InputBox({ onSubmit }) {
  const [input, setInput] = useState('') // what is typed in the box

  function handleSubmit(e) {
    e.preventDefault() // stop the page from reloading
    onSubmit(input)    // send the value up to the parent
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type something..."
        className="rounded border px-3 py-2"
      />
      <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white">
        Submit
      </button>
    </form>
  )
}

export default InputBox
