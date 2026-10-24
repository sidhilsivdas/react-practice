## Problem

This is the most common "type-level" interview task: **write the built-in utility types yourself**. Implement these with a **mapped type**, without using `Partial`, `Required` or `Readonly`:

| Type | `Todo = { title: string; done: boolean }` becomes |
|---|---|
| `MyPartial<T>` | `{ title?: string; done?: boolean }` |
| `MyRequired<T>` | removes every `?` |
| `MyReadonly<T>` | `{ readonly title: string; readonly done: boolean }` |
| `Mutable<T>` | removes every `readonly` |
| `Nullable<T>` | `{ title: string \| null; done: boolean \| null }` |

These are all **type-only** tests: there's no JavaScript to run.

## Examples

A mapped type loops over keys, a bit like `.map()` for types:

```ts
type Flags<T> = { [K in keyof T]: boolean }

type F = Flags<{ title: string; done: boolean }>
// { title: boolean; done: boolean }
```

## Hints

1. `[K in keyof T]` loops over T's keys. `T[K]` is the original value type.
2. Add a modifier: `?` or `readonly`. **Remove** one with a minus: `-?` or `-readonly`.
3. The value side can be any type expression, like `T[K] | null`.

<!-- SOLUTION -->

## Solution

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Nullable<T> = { [K in keyof T]: T[K] | null }
```

These are almost exactly how TypeScript's own `lib.es5.d.ts` defines `Partial`, `Required` and `Readonly`.

## Reading a mapped type

```ts
{ readonly [K in keyof T]?: T[K] | null }
//  │        │  │           │  └── the new value type
//  │        │  │           └───── optional modifier
//  │        │  └───────────────── the keys to loop over
//  │        └──────────────────── a name for the current key
//  └───────────────────────────── readonly modifier
```

| Modifier | Adds | Removes |
|---|---|---|
| Optional | `?` (or `+?`) | `-?` |
| Readonly | `readonly` | `-readonly` |

## Homomorphic mapped types

When you loop over **`keyof T`**, TypeScript keeps each property's existing modifiers. That's why `MyReadonly<{ a?: string }>` is `{ readonly a?: string }`: the `?` survives. It also maps arrays and tuples to arrays and tuples.

```ts
type R = MyReadonly<string[]>   // readonly string[]
```

## Readonly is shallow

```ts
type T = MyReadonly<{ user: { name: string } }>
// { readonly user: { name: string } }   ← user.name can still be changed!
```

Making it deep needs **recursion** (see the DeepReadonly problem).

## 🎯 Interview answer

> "A mapped type builds a new object type by looping over keys: `{ [K in keyof T]: T[K] }` copies T. Adding modifiers gives the built-ins: `?` for `Partial`, `readonly` for `Readonly`, and a minus removes them, so `-?` gives `Required` and `-readonly` gives a `Mutable`. The value side can be transformed too, like `T[K] | null`. Mapping over `keyof T` is homomorphic, so it keeps existing modifiers and works on arrays. These types are shallow; deep versions need recursion."
