## Problem

Make `getProperty(obj, key)` and `pluck(items, key)` fully type-safe:

- The `key` must be an **existing key** of the object (`'email'` on a user without email is an error).
- The result has **that property's type**: `getProperty(user, 'name')` is a `string`, `getProperty(user, 'admin')` is a `boolean`.

**Note:** the `'email'` line in the editor is there on purpose. Once your types work, it becomes an error. Delete it so your code has no type errors.

## Examples

```ts
const user = { id: 1, name: 'Ana', admin: true }

getProperty(user, 'name')     // string
getProperty(user, 'admin')    // boolean
getProperty(user, 'email')    // ❌ '"email"' is not assignable to '"id" | "name" | "admin"'

pluck([user], 'id')           // number[]
pluck([user], 'age')          // ❌
```

## Hints

1. `keyof T` is the union of T's keys: `keyof typeof user` is `'id' | 'name' | 'admin'`.
2. You need two type parameters: `<T, K extends keyof T>`. The constraint makes `K` "one of T's keys".
3. **Indexed access:** `T[K]` is "the type of property K in T". `typeof user['name']` is `string`.

<!-- SOLUTION -->

## Solution

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key])
}
```

## How the types flow

```ts
getProperty(user, 'name')
// T = { id: number; name: string; admin: boolean }   (inferred from obj)
// K = 'name'                                         (inferred from key, and checked: 'name' extends keyof T ✅)
// returns T['name'] = string
```

**Why `K` and not just `keyof T`?**

```ts
function getLoose<T>(obj: T, key: keyof T): T[keyof T] { ... }
getLoose(user, 'name')   // string | number | boolean   ← the type of ANY property
```

A separate `K` remembers **which** key you passed, so the result is precise.

## keyof & T[K] cheat sheet

```ts
type User = { id: number; name: string; tags: string[] }

keyof User              // 'id' | 'name' | 'tags'
User['name']            // string
User['id' | 'name']     // number | string
User[keyof User]        // number | string | string[]   (all value types)
User['tags'][number]    // string                       (item type of an array)
```

## Real-world use

The same pattern types many everyday helpers:

```ts
function sortBy<T, K extends keyof T>(items: T[], key: K): T[] {
  return [...items].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0))
}

// a form field updater in React
function updateField<K extends keyof Form>(key: K, value: Form[K]) {
  setForm((f) => ({ ...f, [key]: value }))
}
updateField('age', 30)      // ✅
updateField('age', '30')    // ❌ age is a number
```

## 🎯 Interview answer

> "`keyof T` gives the union of an object type's keys, and the indexed access type `T[K]` gives the type of property K. Combining them, `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K]` only accepts real keys and returns the exact property type. I use a separate type parameter `K` so TypeScript remembers the specific key, rather than `keyof T`, which would return a union of every property type. The same pattern types helpers like `pluck`, `sortBy`, or a typed form-field updater."
