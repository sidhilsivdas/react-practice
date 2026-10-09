## Problem

Write `deepClone(value)` that returns a **completely independent copy** of objects and arrays, **at every level**. Changing the copy must **never** change the original.

Support primitives, `null`, arrays and plain objects nested in any combination.

## Examples

```js
const original = { name: 'Sam', address: { city: 'Kochi' }, tags: ['a', 'b'] }
const copy = deepClone(original)

copy.address.city = 'Delhi'
copy.tags.push('c')

original.address.city   // 'Kochi'      ✅ unchanged
original.tags           // ['a', 'b']   ✅ unchanged
```

**Why spread isn't enough:**

```js
const shallow = { ...original }
shallow.address.city = 'Delhi'
original.address.city   // 'Delhi' 😱  (nested objects are shared)
```

## Hints

1. **Primitives** (`1`, `'a'`, `true`, `null`) can be returned as they are.
2. **Arrays and objects:** create a new empty one, then **deep clone each value** into it (recursion).

<!-- SOLUTION -->

## Recursive solution

```js
function deepClone(value) {
  if (value === null || typeof value !== 'object') {
    return value                                    // primitive → return as is
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item))     // new array, each item cloned
  }

  const copy = {}
  for (const key of Object.keys(value)) {
    copy[key] = deepClone(value[key])               // new object, each value cloned
  }
  return copy
}
```

**Step by step for `{ a: { b: [1, 2] } }`:**

```
deepClone({ a: {...} })     → object → new {}
  key a → deepClone({ b: [...] }) → object → new {}
            key b → deepClone([1, 2]) → array → [deepClone(1), deepClone(2)] → new [1, 2]
→ { a: { b: [1, 2] } }   every level is a NEW object/array ✅
```

**Why check `null` first?** `typeof null === 'object'`, a famous JavaScript quirk.

## Built-in options

| Method | Handles | Problems |
|---|---|---|
| **`structuredClone(value)`** ⭐ | objects, arrays, **Date, Map, Set, circular references** | ❌ functions and class instances (methods lost) |
| `JSON.parse(JSON.stringify(value))` | plain data | ❌ loses `undefined`, functions and `Symbol`s; `Date` becomes a string; `NaN`/`Infinity` become `null`; **crashes on circular references** |
| `{ ...obj }` / `Object.assign` | — | **shallow** only |

**In real code, use `structuredClone`.** In interviews, write the recursive version and mention `structuredClone`.

## Follow-ups

**"Handle circular references"** (an object that contains itself): use a `WeakMap` to remember what's already been cloned.

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return seen.get(value)          // already cloned → reuse it

  const copy = Array.isArray(value) ? [] : {}
  seen.set(value, copy)                                // remember BEFORE recursing
  for (const key of Object.keys(value)) {
    copy[key] = deepClone(value[key], seen)
  }
  return copy
}

const a = { name: 'loop' }
a.self = a
const b = deepClone(a)
b.self === b    // true ✅ (no infinite recursion)
```

**"Handle Date, Map and Set":**

```js
if (value instanceof Date) return new Date(value)
if (value instanceof Map) return new Map([...value].map(([k, v]) => [deepClone(k), deepClone(v)]))
if (value instanceof Set) return new Set([...value].map(deepClone))
```

**In React:** you usually **don't need** a deep clone for state updates. Copy only the path you change: `{ ...user, address: { ...user.address, city } }`.

## 🎯 Interview answer

> "A deep clone copies every level so nothing is shared with the original, unlike spread, which is shallow. I write it recursively: primitives and null are returned as they are, checking null first because `typeof null` is 'object'; arrays are mapped to new arrays with each item cloned; and objects get a new object with each own key cloned. To handle circular references I pass a WeakMap of already-cloned objects and return the existing copy if I see one again, storing it before recursing. Special types like Date, Map and Set need their own branches. In practice I'd use `structuredClone`, which handles those and circular references, while `JSON.parse(JSON.stringify())` breaks on dates, undefined, functions and cycles."
