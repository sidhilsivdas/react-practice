## Problem

A **discriminated union** is a union of object types that share one literal field (the "tag"), like `kind`. Checking the tag tells TypeScript exactly which member you have.

1. Define `Shape` as a circle (`radius`), a square (`size`) or a rect (`width`, `height`), each with a `kind` tag.
2. Type `assertNever` so it only accepts `never`.
3. Write `area(shape)` with a `switch` on `shape.kind`. In `default`, call `assertNever(shape)`: then if someone adds a `'triangle'` to `Shape` and forgets to handle it, **`area` stops compiling**.

## Examples

```ts
area({ kind: 'circle', radius: 1 })            // 3.14159... (Math.PI * r²)
area({ kind: 'square', size: 3 })              // 9
area({ kind: 'rect', width: 2, height: 5 })    // 10

const c: Shape = { kind: 'circle', size: 2 }   // ❌ a circle has a radius, not a size
```

## Hints

1. `type Shape = { kind: 'circle'; radius: number } | { ... } | { ... }`.
2. Inside `case 'circle':`, TypeScript knows `shape.radius` exists.
3. After every case is handled, the `shape` left in `default` has type **`never`** (nothing is left). That's why `assertNever(shape)` compiles.
4. If a case is missing, `shape` in `default` is that missing member, which isn't `never`, so it's an error.

<!-- SOLUTION -->

## Solution

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rect'; width: number; height: number }

function assertNever(value: never): never {
  throw new Error('Unexpected value: ' + value)
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2   // shape: the circle member
    case 'square':
      return shape.size ** 2
    case 'rect':
      return shape.width * shape.height
    default:
      return assertNever(shape)            // shape: never (all cases handled)
  }
}
```

## The exhaustive check in action

Add a triangle to the union but not to the switch:

```ts
type Shape = ... | { kind: 'triangle'; base: number; height: number }

default:
  return assertNever(shape)
  // ❌ Argument of type '{ kind: "triangle"; ... }' is not assignable to parameter of type 'never'
```

The compiler now lists **every place** that forgot the new shape. That's why discriminated unions are so popular for reducers, API responses and UI states.

**Shorter alternative** without a helper:

```ts
default: {
  const unreachable: never = shape   // same error if a case is missing
  throw new Error('Unknown shape')
}
```

## Modelling state

The same pattern stops "impossible states":

```ts
// ❌ loading: true and error at the same time? data while loading?
type State = { loading: boolean; data?: User; error?: string }

// ✅ exactly one shape at a time
type State =
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string }
```

## 🎯 Interview answer

> "A discriminated union is a union of object types that share a literal tag field, like `kind` or `status`. Switching on the tag narrows to the exact member, so each case can safely use its own fields. For exhaustiveness I pass the value to an `assertNever(value: never)` function in the default case: if all members are handled the value is `never`, and if someone adds a new member without handling it, the compiler errors at every switch. I use this for reducer actions, API results and UI states like loading, success and error, because it makes impossible states unrepresentable."
