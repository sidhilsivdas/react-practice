## Problem

A **union** type means "one of these". Before you can use a value of a union type, you have to **narrow** it: check which one it is, so TypeScript knows which methods are safe.

1. Write `toDisplay(value: Input): string` for `type Input = string | number | string[] | null`:
   - **number** → 2 decimals
   - **string** → trimmed
   - **string[]** → joined with `", "`
   - **null** → `"—"`
2. Write `speak(pet: Cat | Dog)`. It calls `meow()` for a cat and `bark()` for a dog. Use the **`in`** operator.

## Examples

```ts
toDisplay(3.14159)       // "3.14"
toDisplay('  hi  ')      // "hi"
toDisplay(['a', 'b'])    // "a, b"
toDisplay(null)          // "—"

speak({ meow: () => 'Meow' })   // "Meow"
```

Try `value.trim()` **without** a check first: TypeScript stops you with an error, because `value` might be a number.

## Hints

1. `typeof value === 'number'`: inside that `if`, `value` is a `number`.
2. `typeof` can't tell arrays apart (`typeof [] === 'object'`). Use `Array.isArray(value)`.
3. `null`: check `value === null`.
4. `'meow' in pet`: inside that `if`, `pet` is a `Cat`.

<!-- SOLUTION -->

## Solution

```ts
type Input = string | number | string[] | null

function toDisplay(value: Input): string {
  if (value === null) return '—'                     // value: null
  if (typeof value === 'number') return value.toFixed(2)   // value: number
  if (Array.isArray(value)) return value.join(', ')  // value: string[]
  return value.trim()                                // only string is left
}

type Cat = { meow: () => string }
type Dog = { bark: () => string }

function speak(pet: Cat | Dog): string {
  if ('meow' in pet) return pet.meow()   // pet: Cat
  return pet.bark()                      // pet: Dog
}
```

## Narrowing tools

| Check | Narrows to | Use for |
|---|---|---|
| `typeof x === 'string'` | string, number, boolean, function… | Primitives |
| `x === null` / `x !== undefined` | Removes null / undefined | Optional values |
| `Array.isArray(x)` | The array type | Arrays (typeof says `'object'`) |
| `'meow' in x` | The type that has that property | Object unions without a shared tag |
| `x instanceof Date` | That class | Class instances |
| `x.kind === 'circle'` | That union member | **Discriminated unions** (next problems) |

**TypeScript follows your control flow.** After `if (value === null) return`, it knows `value` can't be `null` on the following lines. At the end, only `string` is left, so `value.trim()` is safe.

## Truthiness trap

```ts
function show(count: number | null) {
  if (count) return `${count} items`   // ❌ 0 is falsy, so 0 is treated like null
  if (count !== null) return `${count} items`   // ✅
}
```

## 🎯 Interview answer

> "Narrowing is how TypeScript turns a union into one specific type inside a branch. I use `typeof` for primitives, `Array.isArray` for arrays since `typeof` says 'object', equality checks for `null`, the `in` operator for object unions, and `instanceof` for classes. TypeScript tracks control flow, so after an early return the remaining code sees the narrowed type. For object unions I prefer a shared literal field, a discriminated union, which makes narrowing a simple `switch`."
