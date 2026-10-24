## Problem

`Readonly<T>` and `Partial<T>` only change the **top level**: `Readonly<Config>` still lets you change `config.server.port`. Write **recursive** versions:

1. **`DeepReadonly<T>`**: every property is `readonly` at every level. Arrays become `readonly` arrays. Functions stay as they are.
2. **`DeepPartial<T>`**: every property is optional at every level. Handy for "override some settings" objects.

**Note:** the `config.server.port = 80` line is there on purpose. It should become a type error. Then delete it.

## Examples

```ts
type Config = { server: { host: string; port: number }; debug: boolean }

DeepReadonly<Config>
// { readonly server: { readonly host: string; readonly port: number }; readonly debug: boolean }

DeepReadonly<{ tags: string[] }>          // { readonly tags: readonly string[] }
DeepReadonly<{ log: (m: string) => void }>   // { readonly log: (m: string) => void }

DeepPartial<Config>
// { server?: { host?: string; port?: number }; debug?: boolean }
```

## Hints

1. Start from your `MyReadonly` (mapped types problem), and for each value write `DeepReadonly<T[K]>` instead of `T[K]`: the type **calls itself**.
2. Stop at primitives: `string` and `number` need no change. Check with a conditional type: `T[K] extends object ? ... : T[K]`.
3. Functions are objects too! Check for them **first**: `T[K] extends Function ? T[K] : ...`.
4. Arrays work automatically: a mapped type over an array type gives an array (`readonly` included).

<!-- SOLUTION -->

## Solution

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends Function
    ? T[K]                       // leave functions alone
    : T[K] extends object
      ? DeepReadonly<T[K]>       // objects & arrays: recurse
      : T[K]                     // primitives: done
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Function
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}
```

## How the recursion runs

```ts
DeepReadonly<{ server: { port: number }; tags: string[] }>
// server → { port: number } is an object → DeepReadonly<{ port: number }> → { readonly port: number }
// tags   → string[] is an object         → DeepReadonly<string[]>        → readonly string[]
// port   → number isn't an object        → number                         (stop)
```

**Why arrays "just work":** mapping over `keyof T` when `T` is an array type produces an array type, so `DeepReadonly<string[]>` is `readonly string[]`, and the items are recursed into too.

**Why the function check?** A function is an `object`, so without it, `DeepReadonly` would map over the function's keys and you'd get `{}` instead of a callable type.

## Where it's used

```ts
// app config that must never change after startup
const config: DeepReadonly<Config> = loadConfig()

// tests or settings: override just a few nested values
function makeConfig(overrides: DeepPartial<Config>): Config { ... }
makeConfig({ server: { port: 8080 } })   // ✅ host and debug can be left out
```

**`as const` vs DeepReadonly:** `as const` makes a **value** deeply readonly (with literal types). `DeepReadonly<T>` does it for a **type**, which is better for function parameters and API data.

**Edge cases a production version handles:** `Map`, `Set` and `Date` (they're objects with methods, so they'd be mangled). Libraries like `ts-essentials` and `type-fest` ship complete `DeepReadonly` / `DeepPartial` types.

## 🎯 Interview answer

> "The built-in `Readonly` and `Partial` are shallow, so I write recursive mapped types: for each property, if the value is an object, apply the same type to it again; otherwise keep it. Functions are objects, so I check for them first and leave them unchanged. Arrays work because a mapped type over an array type produces a readonly array. `DeepReadonly` is useful for immutable config or state, and `DeepPartial` for override objects. For production I'd also handle `Map`, `Set` and `Date`, or use a library like type-fest."
