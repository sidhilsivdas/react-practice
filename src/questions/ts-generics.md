## Quick answer

**Generics are type parameters.** A generic function, type or component works with **many types** while **keeping the connection** between input and output types.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}
first([1, 2])        // number | undefined
first(['a', 'b'])    // string | undefined
```

**Without generics** you'd use `any` (losing all type information) or write one function per type.

---

## Why not any

```ts
function firstAny(items: any[]): any { return items[0] }
const a = firstAny([1, 2])     // any: autocomplete is gone and mistakes compile
a.toUpperCase()                 // ✅ compiles … 💥 runtime error

function first<T>(items: T[]): T | undefined { return items[0] }
const b = first([1, 2])         // number | undefined
b?.toUpperCase()                // ❌ Property 'toUpperCase' does not exist on type 'number'.
```

**T is inferred from the argument.** You rarely write `first<number>(...)` yourself.

---

## Constraints with extends

**Limit what `T` can be, so you can use its properties:**

```ts
function len<T>(x: T) {
  return x.length           // ❌ Property 'length' does not exist on type 'T'.
}

function len2<T extends { length: number }>(x: T) {
  return x.length           // ✅ works for strings, arrays, anything with length
}
len2('hello')     // 5
len2([1, 2, 3])   // 3
len2(42)          // ❌ number has no length
```

**`keyof` constraint:** a key that must exist on the object, with the correct return type:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { id: 1, name: 'Asha', admin: true }
getProp(user, 'name')    // string
getProp(user, 'admin')   // boolean
getProp(user, 'email')   // ❌ Argument of type '"email"' is not assignable to parameter of type '"admin" | "id" | "name"'.
```

---

## Generic types & defaults

```ts
// API response wrapper
type ApiResponse<T> = {
  data: T
  error: string | null
  status: number
}
type UserResponse = ApiResponse<User>

// a Result type (success or failure)
type Result<T, E = Error> =            // E has a default
  | { ok: true; value: T }
  | { ok: false; error: E }

// generic interface
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<T>
}

// typed fetch helper
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>      // ⚠️ an assertion: validate with zod in production
}
const users = await getJson<User[]>('/api/users')
```

---

## Generic React components

```tsx
type ListProps<T> = {
  items: T[]
  getKey: (item: T) => string | number
  renderItem: (item: T) => React.ReactNode
}

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>
}

// T is inferred as Product: `p` is fully typed inside the callbacks
<List items={products} getKey={(p) => p.id} renderItem={(p) => p.title} />
```

**Generic hooks:**

```ts
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? (JSON.parse(saved) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue] as const          // a tuple, like useState
}

const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
```

---

## Modern helpers

**`const` type parameters** (TypeScript 5.0) infer literal types without the caller writing `as const`:

```ts
function routes<const T extends readonly string[]>(paths: T) { return paths }
const r = routes(['/home', '/about'])   // readonly ['/home', '/about'] instead of string[]
```

**`NoInfer<T>`** (TypeScript 5.4) stops a parameter from influencing inference:

```ts
function createSelect<T extends string>(options: T[], defaultValue: NoInfer<T>) {}
createSelect(['red', 'blue'], 'green')
// ❌ Argument of type '"green"' is not assignable to parameter of type '"red" | "blue"'.
// without NoInfer, T would widen to include 'green', with no error
```

---

## Interview Q&A

**Q: What problem do generics solve?**
Reusable code that works with many types without losing type information, unlike `any`. They link input and output types.

**Q: What does `T extends X` mean in a generic?**
A constraint: `T` can be any type that is assignable to `X`, so you can safely use `X`'s members.

**Q: How does TypeScript know what `T` is?**
It infers `T` from the arguments. You can pass it explicitly (`useState<User | null>(null)`) when inference isn't enough.

**Q: Write a type-safe `getProp`.**
`function getProp<T, K extends keyof T>(obj: T, key: K): T[K]`. The key must exist, and the return type matches that property.

---

## 🎯 Interview answer

> "Generics are type parameters that make functions, types, classes and components reusable across types while keeping the relationship between inputs and outputs, which `any` would throw away. TypeScript usually infers the type argument from the values passed in. Constraints with `extends` limit what the parameter can be so its members can be used, and the `K extends keyof T` pattern with an indexed return type `T[K]` gives fully type-safe property access. I use generic types for API responses, Result types and repositories, often with defaults, plus generic React components like a typed `List` whose render callbacks infer the item type, and generic hooks like `useLocalStorage<T>`. Newer features help too: `const` type parameters preserve literal types, and `NoInfer` stops a parameter from widening inference. I also remember that a generic `fetch<T>` is just an assertion, so real API data should still be validated."
