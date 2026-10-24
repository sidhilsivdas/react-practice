## Problem

Data from outside your app (JSON, APIs, `localStorage`) can be **anything**. Handle it safely, and return errors as values instead of throwing:

1. **`Result<T>`**: either `{ ok: true; value: T }` or `{ ok: false; error: string }`.
2. **`parseJson(text): Result<unknown>`**: never throws. Invalid JSON gives `ok: false` with the error's message. The value is `unknown`, not `any`, because it could be anything.
3. **`getAge(json): Result<number>`**: parse the text and return its `age`. Fail with `'age must be a number'` unless the data is an object (not `null`, not an array) with a **number** `age`. Bad JSON fails with `parseJson`'s error.

## Examples

```ts
getAge('{"age":30}')     // { ok: true, value: 30 }
getAge('{"age":"30"}')   // { ok: false, error: 'age must be a number' }
getAge('null')           // { ok: false, error: 'age must be a number' }
getAge('oops')           // { ok: false, error: 'Unexpected token ...' } (JSON.parse's message)

const r = getAge(text)
r.value                  // ❌ might be a failure: check r.ok first
if (r.ok) r.value        // ✅ number
```

## Hints

1. `Result<T>` is a **discriminated union**: the `ok` field (`true` / `false` literal types) is the tag.
2. In `catch (error)`, `error` is `unknown` (anything can be thrown). Use `error instanceof Error ? error.message : String(error)`.
3. `JSON.parse` returns `any`; storing it in a `Result<unknown>` makes it `unknown`, so you **must** check it before use.
4. Narrow step by step: `typeof data === 'object' && data !== null && !Array.isArray(data) && 'age' in data && typeof data.age === 'number'`.

<!-- SOLUTION -->

## Solution

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function parseJson(text: string): Result<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    // error is unknown: anything can be thrown, not only Error objects
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function getAge(json: string): Result<number> {
  const parsed = parseJson(json)
  if (!parsed.ok) return parsed                 // pass the failure through

  const data = parsed.value                     // unknown
  if (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    'age' in data &&
    typeof data.age === 'number'
  ) {
    return { ok: true, value: data.age }
  }
  return { ok: false, error: 'age must be a number' }
}
```

## any vs unknown

| | `any` | `unknown` |
|---|---|---|
| Accepts any value | ✅ | ✅ |
| Can be used without checks | ✅ (no safety) | ❌ must narrow first |
| `x.foo.bar()` | compiles, may crash at runtime | type error |
| Use for | (avoid) migrating old JS | outside data, `catch` errors, generic "anything" |

**`unknown` is the type-safe `any`**: it says "I don't know yet", and TypeScript makes you prove what it is before you use it.

## Why a Result type?

```ts
// throwing: the signature hides that it can fail
function getAge(json: string): number { ... }

// Result: the failure is part of the type, so callers MUST handle it
function getAge(json: string): Result<number> { ... }
```

`if (!parsed.ok) return parsed` works because a failed `Result<unknown>` (`{ ok: false; error: string }`) is also a valid failed `Result<number>`.

## catch errors are unknown

With `strict` on (`useUnknownInCatchVariables`), `catch (error)` gives `error: unknown`. JavaScript can `throw 'oops'` or `throw 42`, so `error.message` isn't guaranteed. Always narrow with `instanceof Error`.

## 🎯 Interview answer

> "For data from outside the app I use `unknown` instead of `any`: it accepts anything, but TypeScript forces me to narrow it with `typeof`, `in` or a type guard before using it. Caught errors are `unknown` too in strict mode, so I check `instanceof Error`. For operations that can fail I like a `Result<T>` discriminated union on an `ok` field: the possible failure is in the return type, so callers must check `ok` before reading `value`. For larger schemas I'd use a validation library like Zod."
