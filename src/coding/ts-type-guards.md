## Problem

A **type guard** is a function that checks a value at runtime **and tells TypeScript the result**, so the type narrows wherever you call it.

1. `isDefined` already returns the right boolean, but TypeScript doesn't learn anything from it: `[1, null, 2].filter(isDefined)` is still `(number | null)[]`. Change its **return type** so the result is `number[]`.
2. Write `isUser(value: unknown)`: `true` only for an object (not `null`, not an array) with a **number** `id` and a **string** `name`. Make it a type guard too, so `data.name` works after `if (isUser(data))`.

## Examples

```ts
[1, null, 2, undefined].filter(isDefined)   // number[]   (not (number | null | undefined)[])

isUser({ id: 1, name: 'Ana' })     // true
isUser({ id: '1', name: 'Ana' })   // false: id is a string
isUser({ id: 1 })                  // false: no name
isUser(null)                       // false
```

## Hints

1. The return type `value is T` means "when this returns `true`, `value` is a `T`".
2. Start `isUser` with `typeof value === 'object' && value !== null` (`typeof null` is `'object'`!).
3. After that check, `'id' in value` lets you read `value.id` safely.
4. Arrays are objects too: rule them out with `!Array.isArray(value)`.

<!-- SOLUTION -->

## Solution

```ts
type User = { id: number; name: string }

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  )
}
```

## How a type predicate works

```ts
function isUser(value: unknown): value is User { ... }

if (isUser(data)) {
  data.name   // ✅ data: User here
} else {
  data        // still unknown
}
```

`value is User` is a **promise you make to TypeScript**. It trusts you: if your check is wrong (say you forget to check `name`), TypeScript will believe the lie. So the runtime check has to be complete.

## Why filter needs it

```ts
const a = [1, null, 2].filter((x) => x !== null)   // TS 5.5+: number[] (inferred predicate)
const b = [1, null, 2].filter(Boolean)             // (number | null)[]: Boolean isn't a type guard
const c = [1, null, 2].filter(isDefined)           // number[] ✅ works everywhere
```

`filter` has a special overload: when you pass a type guard, the result array gets the narrowed type. Since TypeScript 5.5, simple arrow functions like `x => x !== null` are **inferred** as type guards too.

## Assertion functions

A cousin: `asserts value is T` throws instead of returning `false`.

```ts
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new Error('Not a user')
}

assertUser(data)
data.name   // ✅ data: User after this line
```

**In real apps**, validating API data by hand gets long. Libraries like **Zod** create the type and the runtime check from one schema.

## 🎯 Interview answer

> "A type guard is a function whose return type is a type predicate, like `value is User`. When it returns true, TypeScript narrows the argument to that type in the calling code. It's how I validate `unknown` data, such as JSON from an API: check it's a non-null object, then use `in` and `typeof` on each field. TypeScript trusts the predicate, so the check must be complete. Guards also make `filter` return a narrowed array, for example `filter(isDefined)` gives `number[]`. Assertion functions with `asserts value is T` throw instead of returning false."
