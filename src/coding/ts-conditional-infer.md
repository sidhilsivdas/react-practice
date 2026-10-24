## Problem

**`infer`** lets a conditional type **pull a type out** of another type, like destructuring for types. Implement:

| Type | Example | Result |
|---|---|---|
| `MyReturnType<T>` | `MyReturnType<() => string>` | `string` |
| `MyParameters<T>` | `MyParameters<(a: number, b: string) => void>` | `[a: number, b: string]` |
| `MyAwaited<T>` | `MyAwaited<Promise<Promise<number>>>` | `number` (unwraps **all** levels) |
| `ElementType<T>` | `ElementType<string[]>` / `ElementType<number>` | `string` / `number` (not an array: unchanged) |

`MyReturnType<string>` and `MyParameters<string>` should be **errors**: only functions are allowed.

## Examples

```ts
type A = MyReturnType<(n: number) => Promise<boolean>>   // Promise<boolean>
type B = MyParameters<() => void>                        // []
type C = MyAwaited<boolean>                              // boolean (not a promise: unchanged)
```

## Hints

1. Pattern: `T extends <shape with infer X> ? X : <fallback>`. If T matches the shape, `X` is whatever was in that spot.
2. Return type: `T extends (...args: any) => infer R ? R : never`.
3. Constrain `T` so non-functions are rejected: `<T extends (...args: any) => any>`. (`any` is the norm in these constraints.)
4. `MyAwaited` calls **itself** in the true branch: that's how it unwraps nested promises.

<!-- SOLUTION -->

## Solution

```ts
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : never

type MyParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never

type MyAwaited<T> = T extends Promise<infer V> ? MyAwaited<V> : T

type ElementType<T> = T extends (infer E)[] ? E : T
```

## How infer works

```ts
MyReturnType<(n: number) => Promise<boolean>>
// does (n: number) => Promise<boolean>  match  (...args: any) => infer R ?
// yes, with R = Promise<boolean>   → result: Promise<boolean>
```

`infer R` declares a new type variable **inside the pattern**. It's only available in the "true" branch.

**`MyAwaited` unwrapping, step by step:**

```ts
MyAwaited<Promise<Promise<number>>>
→ Promise<Promise<number>> extends Promise<infer V>  → V = Promise<number> → MyAwaited<Promise<number>>
→ Promise<number> extends Promise<infer V>           → V = number          → MyAwaited<number>
→ number extends Promise<...>? no                    → number
```

(The real `Awaited` also handles "thenables": any object with a `then` method.)

## Why any in the constraint?

```ts
type Fn = (...args: any) => any      // ✅ every function matches
type Fn2 = (...args: unknown[]) => unknown   // ❌ (n: number) => void doesn't match!
```

Function parameters are checked "backwards" (contravariance): a function needing a `number` can't be used where any `unknown` could be passed in. `any` (or `never[]`) in the parameter spot avoids that. This is one of the few places where `any` is the right tool, and it's what the built-in `ReturnType` uses.

## More infer patterns

```ts
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never   // first tuple item
type PropsOf<C> = C extends (props: infer P) => any ? P : never                  // a component's props
type Unpromise<T> = T extends Promise<infer V> ? V : T                             // one level only
type Head<S> = S extends `${infer H}${string}` ? H : never                       // first character
```

## 🎯 Interview answer

> "A conditional type is `T extends Shape ? A : B`, and inside the shape I can write `infer X` to capture part of T. That's how the built-ins work: `ReturnType` is `T extends (...args: any) => infer R ? R : never`, and `Parameters` infers the argument tuple instead. `Awaited` is recursive: if T is a promise, it infers the inner type and calls itself again, unwrapping nested promises. I constrain the input with `T extends (...args: any) => any` so non-functions error; `any` is needed there because function parameters are contravariant."
