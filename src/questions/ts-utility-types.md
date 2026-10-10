## Quick answer

**Utility types are built-in generic types that transform other types**, so you derive types instead of copying them:

- `Partial`, `Required`, `Readonly`, `Pick`, `Omit` and `Record` reshape objects.
- `Exclude`, `Extract` and `NonNullable` filter unions.
- `ReturnType`, `Parameters` and `Awaited` read function types.

**Together with `keyof`, `typeof` and indexed access (`T['key']`),** one source type stays the **single source of truth**.

---

## Type operators

```ts
const user = { id: 1, name: 'Asha', roles: ['admin'] }

type User = typeof user          // { id: number; name: string; roles: string[] }   (type from a value)
type UserKey = keyof User        // 'id' | 'name' | 'roles'                         (union of keys)
type Roles = User['roles']       // string[]                                        (indexed access)
type Role = User['roles'][number] // string                                         (element of an array)

// a very common combo: union type from a constant object
const STATUS = { active: 'ACTIVE', banned: 'BANNED' } as const
type Status = (typeof STATUS)[keyof typeof STATUS]   // 'ACTIVE' | 'BANNED'

const SIZES = ['sm', 'md', 'lg'] as const
type Size = (typeof SIZES)[number]                    // 'sm' | 'md' | 'lg'
```

---

## Object utilities

```ts
type User = { id: number; name: string; email: string; password: string; avatar?: string }
```

| Utility | Result | Typical use |
|---|---|---|
| `Partial<User>` | All properties optional | Update payloads: `updateUser(id, changes: Partial<User>)` |
| `Required<User>` | All properties required (`avatar` too) | After applying defaults |
| `Readonly<User>` | All properties `readonly` (shallow) | Immutable state, config |
| `Pick<User, 'id' \| 'name'>` | Only `id` and `name` | List items, public views |
| `Omit<User, 'password'>` | Everything except `password` | API responses, form values without `id` |
| `Record<'admin' \| 'user', string[]>` | Object with exactly those keys | Lookup tables, dictionaries: `Record<string, number>` |

```ts
type PublicUser = Omit<User, 'password'>
type CreateUserInput = Omit<User, 'id'>
type UserPreview = Pick<User, 'id' | 'name' | 'avatar'>
type UpdateUserInput = Partial<Omit<User, 'id'>>              // combine them

const permissions: Record<'admin' | 'editor' | 'viewer', string[]> = {
  admin: ['*'],
  editor: ['read', 'write'],
  viewer: ['read'],
  // forgetting a role is an error: every key is required
}
```

**Note:** `Omit` doesn't check that the key exists (`Omit<User, 'typo'>` compiles). `Pick` does.

---

## Union utilities

```ts
type Status = 'idle' | 'loading' | 'success' | 'error'

type Done = Exclude<Status, 'idle' | 'loading'>     // 'success' | 'error'        (remove members)
type Busy = Extract<Status, 'loading' | 'saving'>   // 'loading'                  (keep members also in the 2nd type)
type Name = NonNullable<string | null | undefined>  // string                     (remove null and undefined)
```

---

## Function utilities

```ts
function createUser(name: string, age: number) {
  return { id: crypto.randomUUID(), name, age }
}
async function fetchUser(id: string) {
  return { id, name: 'Asha' }
}

type NewUser = ReturnType<typeof createUser>          // { id: `${string}-…`; name: string; age: number }
type Args = Parameters<typeof createUser>             // [name: string, age: number]
type FetchedUser = Awaited<ReturnType<typeof fetchUser>>   // { id: string; name: string }  (unwraps the Promise)

// also: ConstructorParameters<typeof Class>, InstanceType<typeof Class>
```

**Very useful for third-party functions** that don't export their types, and for Redux: `type RootState = ReturnType<typeof store.getState>`, `type AppDispatch = typeof store.dispatch`.

---

## String utilities

```ts
type Upper = Uppercase<'click'>        // 'CLICK'
type Lower = Lowercase<'CLICK'>        // 'click'
type Cap = Capitalize<'click'>         // 'Click'
type Uncap = Uncapitalize<'Click'>     // 'click'

type Handler = `on${Capitalize<'click' | 'focus'>}`   // 'onClick' | 'onFocus'
```

---

## Build your own

**Utility types are just mapped and conditional types** (see **Advanced types**). Knowing how they're made is a common interview task:

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyRecord<K extends PropertyKey, V> = { [P in K]: V }
type MyExclude<T, U> = T extends U ? never : T
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never

// a common custom one: deep partial (built-ins are shallow)
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
```

---

## Interview Q&A

**Q: `Pick` vs `Omit`?**
`Pick` keeps the listed keys; `Omit` removes them. Use whichever list is shorter, and prefer `Pick` when you want typo safety.

**Q: How do you get a type from a function you don't own?**
`ReturnType<typeof fn>`, `Parameters<typeof fn>`, and `Awaited<…>` for async functions.

**Q: How do you turn an array of strings into a union type?**
`const SIZES = ['sm', 'md'] as const; type Size = (typeof SIZES)[number]`.

**Q: Is `Readonly<T>` deep?**
No, it's shallow. Nested objects can still be changed. Write a recursive `DeepReadonly`, or use `as const` for literals.

---

## 🎯 Interview answer

> "Utility types let me derive types from a single source of truth instead of duplicating them. For objects: `Partial` for update payloads, `Required`, `Readonly`, `Pick` and `Omit` for views like a public user without the password, and `Record` for lookup tables where every key must be present. For unions: `Exclude`, `Extract` and `NonNullable`. For functions: `ReturnType`, `Parameters` and `Awaited`, which are great for third-party code or deriving Redux's `RootState`. Combined with `typeof`, `keyof` and indexed access, like `(typeof SIZES)[number]` on an `as const` array, the types follow the code automatically. I know they're built from mapped and conditional types, so I can write my own, like a `DeepPartial`, and I remember that `Readonly` and `Partial` are shallow and that `Omit` doesn't validate its keys."
