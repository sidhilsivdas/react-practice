## Problem

Two custom hooks that return `[value, setter]` pairs, like `useState`. Type them so each item keeps **its own** type:

1. **`useToggle(initial?)`** returns `[on, toggle]`. Right now TypeScript infers the return as an **array** `(boolean | (() => void))[]`, so `on` and `toggle` both get that mixed type, and `onClick={toggle}` fails. Make it a **tuple**.
2. **`useLocalStorage(key, initial)`** is `useState` that also saves to `localStorage`. Make it **generic**, so the value's type comes from `initial`.

## Examples

```tsx
const [open, toggle] = useToggle()                    // open: boolean, toggle: () => void

const [theme, setTheme] = useLocalStorage('theme', 'dark')   // theme: string
setTheme('light')    // ✅
setTheme(42)         // ❌

const [ids, setIds] = useLocalStorage('ids', [1, 2])  // ids: number[]
```

## Hints

1. Return `[on, toggle] as const` to get a readonly tuple, **or** write the return type: `: [boolean, () => void]`.
2. `function useLocalStorage<T>(key: string, initial: T)`. Then `useState<T>(...)` and `next: T`.
3. `JSON.parse` returns `any`. Tell TypeScript what you expect: `JSON.parse(saved) as T`.

<!-- SOLUTION -->

## Solution

```tsx
import { useState } from 'react'

function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = () => setOn((v) => !v)
  return [on, toggle] as const        // readonly [boolean, () => void]
}

function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    return saved !== null ? (JSON.parse(saved) as T) : initial
  })

  function save(next: T) {
    setValue(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  return [value, save]
}
```

## Array vs tuple

```ts
function a() { return [true, () => {}] }            // (boolean | (() => void))[]   ← an array of a mix
function b() { return [true, () => {}] as const }   // readonly [boolean, () => void]   ← a tuple
function c(): [boolean, () => void] { return [true, () => {}] }   // also a tuple
```

A **tuple** is an array with a fixed length and a known type at each position. That's what `useState` returns, and why destructuring `[value, setValue]` gives two different types.

**Return an object instead?** For hooks returning more than 2–3 things, `return { data, error, loading }` is clearer: callers pick fields by name and no tuple typing is needed.

## Generic hooks

`useLocalStorage<T>` works like `useState<T>`: `T` is inferred from `initial`.

```ts
useLocalStorage('theme', 'dark')                       // T = string
useLocalStorage<'light' | 'dark'>('theme', 'dark')     // pass T for a narrower type
useLocalStorage<User | null>('user', null)             // needed when initial is null
```

**`as T` is a promise, not a check:** `JSON.parse(saved) as T` doesn't verify what's in storage. If the stored data might be old or edited, validate it (with a type guard or Zod) instead.

## 🎯 Interview answer

> "When a custom hook returns a pair like `useState`, TypeScript infers an array of a union by default, so destructured items lose their individual types. I fix it with `as const` or an explicit tuple return type like `[boolean, () => void]`. For reusable hooks I use generics: `useLocalStorage<T>(key, initial: T)` infers `T` from the initial value and passes it to `useState<T>`, so the setter only accepts that type. For hooks returning many values, I return an object instead of a tuple."
