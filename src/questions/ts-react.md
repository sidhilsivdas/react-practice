## Quick answer

**The key patterns:**

- **Props:** `type Props = {...}`. Use `children: React.ReactNode`, and extend native elements with `ComponentProps<'button'>`.
- **State:** `useState<User | null>(null)` when the initial value doesn't show the full type.
- **Refs:** `useRef<HTMLInputElement>(null)`.
- **Events:** `ChangeEvent<HTMLInputElement>`, `SubmitEvent<HTMLFormElement>`, `MouseEvent<HTMLButtonElement>`.
- **Reducers:** a discriminated union of actions.
- **Context:** `createContext<Value | null>(null)` plus a custom hook that throws when there's no provider.

---

## Typing props

```tsx
type ButtonProps = {
  label: string
  variant?: 'primary' | 'ghost'          // optional with a union of allowed values
  disabled?: boolean
  onClick: () => void                    // a callback prop
}

function Button({ label, variant = 'primary', disabled = false, onClick }: ButtonProps) {
  return <button className={variant} disabled={disabled} onClick={onClick}>{label}</button>
}

<Button label="Save" variant="danger" onClick={save} />
// ❌ Type '"danger"' is not assignable to type '"ghost" | "primary" | undefined'.
```

**Children:**

```tsx
type CardProps = { title: string; children: React.ReactNode }   // anything renderable: JSX, string, number, null, arrays
function Card({ title, children }: CardProps) {
  return <section><h2>{title}</h2>{children}</section>
}

<Card title="Profile" />
// ❌ Property 'children' is missing in type '{ title: string; }' but required in type 'CardProps'.
```

**`React.FC` or a plain function?** Both work. Since React 18, `FC` no longer adds `children` automatically. Many teams prefer **plain functions with typed props**: simpler, and they work with generics.

---

## Extending native elements

**Accept all normal `<button>` props (`type`, `aria-*`, `onClick`, …) plus your own:**

```tsx
import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'ghost'
}

function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className ?? ''}`} {...rest} />
}

<Button type="submit" aria-label="Save" disabled>Save</Button>   // all native props are typed

// the props of another component:
type InputProps = ComponentProps<typeof TextField>
// remove a native prop you control yourself:
type SafeInputProps = Omit<ComponentProps<'input'>, 'type'>
```

**React 19: `ref` is a normal prop** for function components, so `forwardRef` is no longer needed. `ComponentProps<'input'>` already includes `ref`.

```tsx
function TextInput({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return <label>{label}<input {...props} /></label>      // ref is passed through with ...props
}
```

---

## State & refs

```tsx
const [count, setCount] = useState(0)                      // inferred: number
setCount('1')   // ❌ Argument of type 'string' is not assignable to parameter of type 'SetStateAction<number>'.

const [user, setUser] = useState<User | null>(null)        // explicit: null now, a User later
user.name       // ❌ 'user' is possibly 'null'.
user?.name      // ✅

const [items, setItems] = useState<Product[]>([])           // without <Product[]>: never[]
```

```tsx
// DOM ref: pass null; TypeScript gives RefObject<HTMLInputElement | null>
const inputRef = useRef<HTMLInputElement>(null)
inputRef.current?.focus()

// mutable value ref (timer IDs, previous values): no re-render on change
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
timerRef.current = setTimeout(tick, 1000)
```

**React 19 types:** `useRef` **requires an argument** (`useRef<number>()` without one is an error). Use `useRef<number | undefined>(undefined)`.

---

## Events

```tsx
import type { ChangeEvent, SubmitEvent, MouseEvent, KeyboardEvent } from 'react'

function SignupForm() {
  const [email, setEmail] = useState('')

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') setEmail('') }
  const onClick = (e: MouseEvent<HTMLButtonElement>) => console.log(e.clientX)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
  }

  return (
    <form onSubmit={onSubmit}>
      <input value={email} onChange={onChange} onKeyDown={onKeyDown} />
      <button onClick={onClick}>Sign up</button>
    </form>
  )
}
```

**Notes:**
- In the current React types (19.x), **`FormEvent` is deprecated**. Use `SubmitEvent` for forms and `ChangeEvent` / `InputEvent` for inputs.
- **Inline handlers don't need types:** `onChange={(e) => setEmail(e.target.value)}` infers `e` automatically.
- For a handler **prop**, type it as `onChange: (value: string) => void`, or with `React.ChangeEventHandler<HTMLInputElement>`.

---

## useReducer

**Discriminated union actions:** each `case` knows its payload:

```tsx
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Product[] }
  | { status: 'error'; error: string }

type Action =
  | { type: 'fetch' }
  | { type: 'resolve'; data: Product[] }
  | { type: 'reject'; error: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch':   return { status: 'loading' }
    case 'resolve': return { status: 'success', data: action.data }   // action.data exists only here
    case 'reject':  return { status: 'error', error: action.error }
  }
}

const [state, dispatch] = useReducer(reducer, { status: 'idle' })
dispatch({ type: 'resolve' })   // ❌ Property 'data' is missing
```

---

## Context

**Pattern: a `null` default plus a hook that throws**, so consumers never deal with `undefined`:

```tsx
type AuthContextValue = { user: User | null; login: (email: string, pw: string) => Promise<void>; logout: () => void }

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const value = useMemo(() => ({ user, login: async () => {}, logout: () => setUser(null) }), [user])
  return <AuthContext value={value}>{children}</AuthContext>     // React 19: <Context> as provider
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx                                   // type: AuthContextValue (no null)
}
```

---

## Custom hooks & data

```tsx
// return a tuple: `as const` keeps positions typed (otherwise (boolean | (() => void))[])
function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn((v) => !v), [])
  return [on, toggle] as const
}

// TanStack Query: type the query function, and the data is inferred
const { data } = useQuery({
  queryKey: ['user', id],
  queryFn: async (): Promise<User> => UserSchema.parse(await api.get(`/users/${id}`)),
})
// data: User | undefined
```

**Generic components:** see **Generics** (a typed `List<T>`).

**Typing the environment:**

```ts
// vite-env.d.ts: typed import.meta.env
interface ImportMetaEnv { readonly VITE_API_URL: string }
interface ImportMeta { readonly env: ImportMetaEnv }
```

---

## Interview Q&A

**Q: How do you type `children`?**
`React.ReactNode` accepts anything React can render. Use something narrower (like `React.ReactElement`) only when you really require an element.

**Q: How do you accept all native button props?**
`ComponentProps<'button'> & { variant?: … }`, then spread `...rest` onto the `<button>`.

**Q: Why `useState<User | null>(null)`?**
From `null` alone, TypeScript would infer the type `null` forever. The generic says it will become a `User` later.

**Q: How do you type a context safely?**
`createContext<Value | null>(null)` plus a custom hook that throws when the value is `null`, which returns a non-null type.

**Q: Do you need `forwardRef` with TypeScript in React 19?**
No. `ref` is a regular prop for function components, and `ComponentProps<'input'>` includes it.

---

## 🎯 Interview answer

> "In React with TypeScript, I type props with a `Props` type: unions for variants, `React.ReactNode` for children, and callback signatures for handlers. Plain functions instead of `React.FC` keep it simple and generic-friendly. To wrap native elements I intersect `ComponentProps<'button'>` with my own props and spread the rest, and in React 19 `ref` is just a prop, so `forwardRef` isn't needed. State is inferred for simple values, and I pass a generic for nullable or empty initial values, like `useState<User | null>(null)` or `useState<Product[]>([])`. DOM refs are `useRef<HTMLInputElement>(null)`, and React 19's types require an initial value. Events use `ChangeEvent`, `MouseEvent`, `KeyboardEvent`, and `SubmitEvent` for forms, since `FormEvent` is now deprecated, though inline handlers infer their types. Reducers use discriminated union actions so each case knows its payload. Context uses a `null` default with a custom hook that throws outside the provider. Custom hooks return tuples with `as const`, and data hooks are typed from schema-validated query functions."
