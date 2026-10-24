## Problem

Write a typed `groupBy(items, getKey)`: it calls `getKey` on every item and groups the items under the key it returns.

Types:

- `getKey` receives the **item type** (so `(u) => u.role` autocompletes).
- The key must be a valid object key: a `string`, `number` or `symbol`.
- The result is a **`Partial<Record<Key, Item[]>>`**. *Partial* because a key might have no items (no admins at all).

## Examples

```ts
groupBy(['one', 'two', 'three'], (s) => s.length)
// { 3: ['one', 'two'], 5: ['three'] }        type: Partial<Record<number, string[]>>

type User = { name: string; role: 'admin' | 'member' }
groupBy(users, (u) => u.role)
// { admin: [...], member: [...] }            type: Partial<Record<'admin' | 'member', User[]>>

groupBy([1, 2], (n) => ({ n }))   // ❌ an object can't be a key
```

## Hints

1. Two type parameters: `T` for items, `K` for keys.
2. `PropertyKey` is a built-in alias for `string | number | symbol`. Use it as `K`'s constraint.
3. Start with `const result: Partial<Record<K, T[]>> = {}`, then for each item: `(result[key] ??= []).push(item)`.

<!-- SOLUTION -->

## Solution

```ts
function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Partial<Record<K, T[]>> {
  const result: Partial<Record<K, T[]>> = {}
  for (const item of items) {
    const key = getKey(item)
    ;(result[key] ??= []).push(item)
  }
  return result
}
```

`??=` assigns only if the left side is `null` or `undefined`: "create the array the first time we see this key".

## How inference works here

```ts
groupBy(users, (u) => u.role)
// 1. items: User[]           → T = User
// 2. getKey gets (item: User) → u is typed, autocomplete works
// 3. u.role is 'admin' | 'member' → K = 'admin' | 'member'
```

TypeScript infers `T` from `items` **first**, then uses it to type the callback's parameter. That's why `getKey` doesn't need an annotation.

## Why Partial?

```ts
const byRole = groupBy([], (u: User) => u.role)
// with Record<K, T[]>:           byRole.admin is User[]    ← a lie: it's undefined!
// with Partial<Record<K, T[]>>:  byRole.admin is User[] | undefined   ← honest
```

The built-in **`Object.groupBy`** (ES2024) is typed exactly like this: `Partial<Record<K, T[]>>`.

## Same idea with reduce

```ts
function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K) {
  return items.reduce<Partial<Record<K, T[]>>>((acc, item) => {
    const key = getKey(item)
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})
}
```

`reduce<Type>(...)` sets the accumulator's type. Without it, the `{}` start value would be typed `{}`.

## 🎯 Interview answer

> "I make groupBy generic over the item type `T` and key type `K extends PropertyKey`, so keys are limited to strings, numbers and symbols. TypeScript infers `T` from the array, then uses it to type the callback parameter, and infers `K` from what the callback returns, which can even be a literal union like `'admin' | 'member'`. I return `Partial<Record<K, T[]>>`, because a key may have no items, which is also how `Object.groupBy` is typed. Inside, I build the result with a loop and `??=`."
