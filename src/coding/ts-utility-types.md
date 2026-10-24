## Problem

Writing the same fields again and again goes out of sync. TypeScript has **utility types** that build new types from existing ones. Using **only** `User` and utility types, define:

| Type | Should be |
|---|---|
| `UserUpdate` | Every field **optional**, and **no `id`** |
| `PublicUser` | `User` **without** `password` (safe to send to the browser) |
| `UserPreview` | **Only** `id` and `name` |
| `UsersByRole` | An object with a `User[]` for each role: `{ admin: User[]; member: User[] }` |
| `UpdateArgs` | The parameter types of `updateUser`, as a tuple |

## Examples

```ts
updateUser(user, { name: 'Anna' })   // ✅ change just the name
updateUser(user, {})                 // ✅
updateUser(user, { id: 2 })          // ❌ the id can't be changed

const preview: UserPreview = { id: 1, name: 'Ana' }
```

## Hints

| Utility | Does |
|---|---|
| `Partial<T>` | All properties optional |
| `Pick<T, 'a' \| 'b'>` | Keep only these keys |
| `Omit<T, 'a'>` | Remove these keys |
| `Record<K, V>` | An object with keys `K`, each with a `V` value |
| `Parameters<F>` | A function's parameter types, as a tuple |

1. Utility types **combine**: `Partial<Omit<User, 'id'>>`.
2. `User['role']` is `'admin' | 'member'`, a good `K` for `Record`.
3. `Parameters` needs a function **type**: `typeof updateUser`.

<!-- SOLUTION -->

## Solution

```ts
interface User {
  id: number
  name: string
  email: string
  password: string
  role: 'admin' | 'member'
}

type UserUpdate = Partial<Omit<User, 'id'>>
type PublicUser = Omit<User, 'password'>
type UserPreview = Pick<User, 'id' | 'name'>
type UsersByRole = Record<User['role'], User[]>

function updateUser(user: User, changes: UserUpdate): User {
  return { ...user, ...changes }
}

type UpdateArgs = Parameters<typeof updateUser>   // [user: User, changes: UserUpdate]
```

Now add a `phone` field to `User`: `UserUpdate`, `PublicUser` and friends update **by themselves**.

## Utility types cheat sheet

| Utility | Example | Result |
|---|---|---|
| `Partial<T>` | `Partial<{ a: number }>` | `{ a?: number }` |
| `Required<T>` | `Required<{ a?: number }>` | `{ a: number }` |
| `Readonly<T>` | `Readonly<{ a: number }>` | `{ readonly a: number }` |
| `Pick<T, K>` | `Pick<User, 'id'>` | `{ id: number }` |
| `Omit<T, K>` | `Omit<User, 'password'>` | everything but `password` |
| `Record<K, V>` | `Record<'a' \| 'b', number>` | `{ a: number; b: number }` |
| `Exclude<U, X>` | `Exclude<'a' \| 'b', 'a'>` | `'b'` |
| `Extract<U, X>` | `Extract<'a' \| 'b', 'a'>` | `'a'` |
| `NonNullable<T>` | `NonNullable<string \| null>` | `string` |
| `ReturnType<F>` | `ReturnType<() => number>` | `number` |
| `Parameters<F>` | `Parameters<(a: string) => void>` | `[a: string]` |
| `Awaited<T>` | `Awaited<Promise<User>>` | `User` |

**Pick/Omit vs Exclude/Extract:** `Pick` and `Omit` work on an **object's keys**; `Exclude` and `Extract` work on a **union's members**.

## Real-world patterns

```ts
type CreateUserInput = Omit<User, 'id'>                    // the server makes the id
type UserFormErrors = Partial<Record<keyof User, string>>  // an error message per field, maybe
type ApiUser = Awaited<ReturnType<typeof fetchUser>>       // the type a function resolves to
```

## 🎯 Interview answer

> "Utility types derive new types from existing ones, so there's a single source of truth. `Partial` makes everything optional, which is great for update payloads; `Pick` and `Omit` keep or drop keys, like `Omit<User, 'password'>` for public data; `Record<K, V>` builds a dictionary type; and `ReturnType`, `Parameters` and `Awaited` extract types from functions. They compose, for example `Partial<Omit<User, 'id'>>`. When the base type changes, every derived type updates automatically."
