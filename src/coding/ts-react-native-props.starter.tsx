import { useRef, type ComponentProps } from 'react'

// 1. TextInput should accept EVERY normal <input> prop (type, placeholder, onChange...)
//    plus its own required `label`
type TextInputProps = { label: string }

function TextInput({ label, ...rest }: TextInputProps) {
  return (
    <label>
      {label}
      <input {...rest} />
    </label>
  )
}

// 2. Type the ref so inputRef.current?.focus() works
function SearchBox() {
  const inputRef = useRef(null)

  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  )
}
