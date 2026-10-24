## Problem

Two everyday React + TypeScript tasks:

1. **Wrap a native element.** `TextInput` renders an `<input>` and passes the other props through with `...rest`. Type its props so it accepts **every normal `<input>` prop** (`type`, `placeholder`, `required`, `onChange`…) plus its own required `label`.
2. **Type a DOM ref.** In `SearchBox`, `inputRef.current?.focus()` is an error, because `useRef(null)` doesn't know what element it will hold.

## Examples

```tsx
<TextInput label="Email" type="email" placeholder="you@example.com" required />   // ✅
<TextInput label="Name" onChange={(e) => console.log(e.target.value)} />          // ✅ e is typed

<TextInput type="email" />            // ❌ label is missing
<TextInput label="Age" type={42} />   // ❌ type must be a string
```

## Hints

1. `ComponentProps<'input'>` (already imported) is the type of all props `<input>` accepts.
2. Combine two object types with `&` (intersection), or with `interface X extends ...`.
3. For DOM refs, pass the element type and start with `null`: `useRef<HTMLInputElement>(null)`.

<!-- SOLUTION -->

## Solution

```tsx
import { useRef, type ComponentProps } from 'react'

type TextInputProps = ComponentProps<'input'> & { label: string }

function TextInput({ label, ...rest }: TextInputProps) {
  return (
    <label>
      {label}
      <input {...rest} />
    </label>
  )
}

function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  )
}
```

## Extending native props

```tsx
// all three are common:
type A = ComponentProps<'input'> & { label: string }
interface B extends ComponentProps<'button'> { variant: 'primary' | 'ghost' }
type C = Omit<ComponentProps<'input'>, 'size'> & { size: 'sm' | 'lg' }   // replace a native prop
```

| Type | Use |
|---|---|
| `ComponentProps<'input'>` | All props of `<input>`, including `ref` (React 19) |
| `ComponentPropsWithoutRef<'input'>` | Same, without `ref` |
| `ComponentProps<typeof Button>` | The props of **your own** component |
| `InputHTMLAttributes<HTMLInputElement>` | Older style; same idea, no `ref` |

`ComponentProps<typeof Button>` is handy to reuse another component's props without exporting its type.

## Typing refs

| Use | Write | `.current` |
|---|---|---|
| A DOM element | `useRef<HTMLInputElement>(null)` | `HTMLInputElement \| null` (React sets it) |
| A value you change (timer id, previous value) | `useRef<number \| null>(null)` | you assign it yourself |

Always use `?.` (or a null check) on DOM refs: `.current` is `null` before the element mounts and after it unmounts.

**Passing a ref to your own component:** in React 19, `ref` is a normal prop. With `ComponentProps<'input'>` it's already included, so `<TextInput ref={inputRef} label="Email" />` works. (Before React 19 you needed `forwardRef`.)

## 🎯 Interview answer

> "To wrap a native element, I type the props as `ComponentProps<'input'>` intersected with my own props, and spread the rest onto the element, so the wrapper accepts every native attribute and event handler with correct types. I use `Omit` when I need to replace a native prop. For DOM refs I write `useRef<HTMLInputElement>(null)`; `current` is then `HTMLInputElement | null`, so I use optional chaining. In React 19, `ref` is a regular prop, so `forwardRef` is no longer needed."
