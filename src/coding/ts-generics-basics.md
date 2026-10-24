## Problem

With `any`, these helpers lose the type of whatever you pass in: `first([1, 2, 3])` comes back as `any`. **Generics** fix that: a type parameter like `<T>` captures the type of the input so the output can use it.

1. `first(items)`: the first item, or `undefined` when the array is empty.
2. `wrap(value)`: returns `[value]`.
3. `merge(a, b)`: combines two objects. It should **only accept objects**, and the result has both objects' property types.

## Examples

```ts
first([1, 2, 3])                 // number | undefined
first(['a', 'b'])                // string | undefined
wrap('hi')                       // string[]

const m = merge({ id: 1 }, { name: 'Ana' })
m.id      // number
m.name    // string
merge({ id: 1 }, 'text')         // ❌ 'text' is not an object
```

## Hints

1. `function first<T>(items: T[]): ...`. TypeScript **infers** `T` from the argument, so callers don't write `first<number>(...)`.
2. An empty array has no first item, so be honest: the return type is `T | undefined`.
3. `merge` needs **two** type parameters: `<A, B>`. The result is `A & B` (an intersection: both at once).
4. Restrict a type parameter with **`extends`**: `<A extends object>`.

<!-- SOLUTION -->

## Solution

```ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}

function wrap<T>(value: T): T[] {
  return [value]
}

function merge<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b }
}
```

## What a generic is

Think of `<T>` as a **parameter for a type**. Normal parameters receive values when you call a function; type parameters receive types, usually inferred from the arguments:

```ts
first([1, 2, 3])      // T = number   → returns number | undefined
first(['a'])          // T = string   → returns string | undefined
first<boolean>([])    // you can also pass T yourself
```

**any vs unknown vs generic:**

| Signature | `first([1, 2])` returns | Problem |
|---|---|---|
| `(items: any[]): any` | `any` | No checking at all afterwards |
| `(items: unknown[]): unknown` | `unknown` | Safe, but you have to re-check the type |
| `<T>(items: T[]): T \| undefined` | `number \| undefined` | ✅ keeps the type |

## Constraints with extends

`<A extends object>` means "A can be any type, **as long as** it's an object". Without it, `merge(1, 2)` would compile. Other common constraints:

```ts
<T extends string>                    // only strings (or string literals)
<T extends { id: number }>            // anything with a numeric id
<K extends keyof T>                   // a key of T (next problem)
<T extends unknown[]>                 // any array or tuple
```

## Why T | undefined?

`items[0]` on an empty array is `undefined`. By default TypeScript types `items[0]` as `T` (it doesn't know the length). Writing `T | undefined` forces callers to handle the empty case. The `noUncheckedIndexedAccess` compiler option makes **every** index access do this.

## 🎯 Interview answer

> "Generics are type parameters: they let a function, type or component work with many types while keeping the link between input and output. For `first<T>(items: T[]): T | undefined`, TypeScript infers `T` from the argument, so passing numbers gives back a number. Unlike `any`, nothing is lost. I add constraints with `extends`, for example `<A extends object>` so `merge` only accepts objects, and I return `A & B` so the result has both shapes. I use `unknown` instead when I truly don't care about the type."
