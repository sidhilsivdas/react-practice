## Problem

Implement four more built-in utility types yourself, without using the real ones:

| Type | Example | Result |
|---|---|---|
| `MyPick<T, K>` | `MyPick<Todo, 'title' \| 'done'>` | `{ title: string; done: boolean }` |
| `MyExclude<T, U>` | `MyExclude<'a' \| 'b' \| 'c', 'a'>` | `'b' \| 'c'` |
| `MyOmit<T, K>` | `MyOmit<Todo, 'description'>` | `{ title: string; done: boolean }` |
| `MyRecord<K, V>` | `MyRecord<'a' \| 'b', number>` | `{ a: number; b: number }` |

with `type Todo = { title: string; description: string; done: boolean }`.

`MyPick<Todo, 'nope'>` must be an **error**: `K` has to be a key of `T`.

## Hints

1. **Pick:** constrain `K extends keyof T`, then map over **`K`** instead of `keyof T`.
2. **Exclude** is a **conditional type**: `T extends U ? never : T`. When `T` is a union, it's checked **one member at a time** (distributive), and `never` members disappear.
3. **Omit** = Pick the keys that are left after you Exclude the omitted ones. Combine your own types.
4. **Record:** `K extends PropertyKey` (string | number | symbol), then map over `K`.

<!-- SOLUTION -->

## Solution

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

type MyExclude<T, U> = T extends U ? never : T

type MyOmit<T, K extends PropertyKey> = MyPick<T, MyExclude<keyof T, K>>

type MyRecord<K extends PropertyKey, V> = { [P in K]: V }
```

## Exclude step by step

Conditional types **distribute** over unions when the checked type is a bare type parameter:

```ts
MyExclude<'a' | 'b' | 'c', 'a'>
= ('a' extends 'a' ? never : 'a')
| ('b' extends 'a' ? never : 'b')
| ('c' extends 'a' ? never : 'c')
= never | 'b' | 'c'
= 'b' | 'c'                      // never disappears from a union
```

`Extract` is the opposite: `T extends U ? T : never` keeps the matching members.

## Omit step by step

```ts
MyOmit<Todo, 'description'>
= MyPick<Todo, MyExclude<'title' | 'description' | 'done', 'description'>>
= MyPick<Todo, 'title' | 'done'>
= { title: string; done: boolean }
```

**Why `K extends PropertyKey` and not `keyof T` for Omit?** The built-in `Omit` also lets you omit keys that don't exist (`Omit<T, 'whatever'>` isn't an error). It's a deliberate choice; a stricter version uses `K extends keyof T`.

**A one-step Omit** using key remapping (`as`): a key mapped to `never` is dropped.

```ts
type MyOmit2<T, K extends PropertyKey> = { [P in keyof T as P extends K ? never : P]: T[P] }
```

## Pick vs Record

| | Maps over | Value |
|---|---|---|
| `MyPick<T, K>` | `K` (some of T's keys) | `T[P]`, the original type |
| `MyRecord<K, V>` | `K` (any keys) | `V`, the same for all |

## 🎯 Interview answer

> "Pick is a mapped type over a subset of keys: `K extends keyof T`, then `{ [P in K]: T[P] }`. Exclude is a distributive conditional type, `T extends U ? never : T`: for a union, each member is checked separately and the matches become `never`, which disappears. Omit is then Pick with the excluded keys, `Pick<T, Exclude<keyof T, K>>`, or one step with key remapping using `as`. Record maps a key union to one value type, with `K extends PropertyKey`."
