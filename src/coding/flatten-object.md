## Problem

Write `flattenObject(obj)` that turns a **nested object** into a **single-level object** whose keys are the **paths joined with dots**.

- **Nested objects** become dot keys: `{ a: { b: 1 } }` → `{ 'a.b': 1 }`.
- **Arrays** use their index as the key: `{ tags: ['js'] }` → `{ 'tags.0': 'js' }`.
- **Other values** (numbers, strings, booleans, `null`) are kept as they are.
- **Empty `{}` or `[]`** are kept as the value, so no data disappears.
- **Don't change** the original object.

## Examples

```js
flattenObject({ a: 1, b: { c: 2, d: { e: 3 } } })
// { a: 1, 'b.c': 2, 'b.d.e': 3 }

flattenObject({ user: { name: 'Sam', tags: ['js', 'react'] } })
// { 'user.name': 'Sam', 'user.tags.0': 'js', 'user.tags.1': 'react' }

flattenObject({ a: null, b: {} })
// { a: null, b: {} }
```

**Real use:**

- **Form errors from an API:** `{ 'address.city': 'Required' }`.
- **MongoDB / Firebase updates:** `{ 'profile.age': 26 }` updates one nested field.
- **Translation keys:** `t('home.title')`.
- **Analytics events, query strings and CSV columns.**

## Hints

1. **Walk through each key.** If the value is an object (or array) with something inside, go deeper (recursion).
2. **Carry the path so far** (a `prefix`), and add `.key` as you go down.
3. **`typeof null === 'object'`**, so check for `null` first.

<!-- SOLUTION -->

## Recursion with a prefix

```js
function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key          // 'b' → 'b.d' → 'b.d.e'
    const isNested = value !== null && typeof value === 'object'

    if (isNested && Object.keys(value).length > 0) {
      flattenObject(value, path, result)                      // go deeper, same result object
    } else {
      result[path] = value                                    // a leaf: save it
    }
  }
  return result
}
```

**Step by step for `{ a: 1, b: { c: 2, d: { e: 3 } } }`:**

```
key a → value 1          → leaf   → result['a'] = 1
key b → value {c, d}     → nested → flatten({c, d}, prefix 'b')
          key c → 2       → leaf   → result['b.c'] = 2
          key d → {e}     → nested → flatten({e}, prefix 'b.d')
                    key e → 3 → leaf → result['b.d.e'] = 3
→ { a: 1, 'b.c': 2, 'b.d.e': 3 } ✅
```

**Key points:**

| Piece | Why |
|---|---|
| `Object.entries(obj)` | Works for **arrays too**: `['js', 'react']` gives `['0', 'js'], ['1', 'react']`, so indexes become keys |
| `value !== null` | `typeof null` is `'object'`, a famous JavaScript quirk |
| `Object.keys(value).length > 0` | Empty `{}` / `[]` are saved as values instead of disappearing. A `Date` has no own keys either, so it's kept as a value too. |
| One shared `result` | Every level writes into the same object, with no merging needed |
| Default parameters | Callers just use `flattenObject(obj)` |

- **Time: O(n)** for n total values. **Space: O(depth)** for the recursion.

## Return and merge

**The same idea without passing `result` around:** each call returns its own flat object, and the parent merges them. Some interviewers find this "purer".

```js
function flattenObject(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const isNested = value !== null && typeof value === 'object' && Object.keys(value).length > 0
    return isNested
      ? { ...acc, ...flattenObject(value, path) }
      : { ...acc, [path]: value }
  }, {})
}
```

**Readable, but slower:** the spreads copy `acc` on every key. The first version is better for big objects.

## Iterative (stack)

**No recursion**, so very deep objects can't overflow the call stack:

```js
function flattenObject(obj) {
  const result = {}
  const stack = [[obj, '']]                     // [current object, path so far]

  while (stack.length) {
    const [current, prefix] = stack.pop()
    for (const [key, value] of Object.entries(current)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (value !== null && typeof value === 'object' && Object.keys(value).length > 0) {
        stack.push([value, path])
      } else {
        result[path] = value
      }
    }
  }
  return result
}
```

(The keys may come out in a different **order** than the recursive version, but the content is the same.)

## Unflatten

**The most common follow-up:** turn it back. `{ 'a.b': 1 }` → `{ a: { b: 1 } }`.

```js
function unflattenObject(flat) {
  const result = {}

  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split('.')               // 'user.tags.0' → ['user', 'tags', '0']
    let node = result

    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        node[key] = value                      // last key: set the value
      } else {
        const nextIsIndex = /^\d+$/.test(keys[i + 1])
        node[key] ??= nextIsIndex ? [] : {}    // create an array or object if missing
        node = node[key]                       // move one level down
      }
    })
  }
  return result
}

unflattenObject({ 'user.name': 'Sam', 'user.tags.0': 'js' })
// { user: { name: 'Sam', tags: ['js'] } }
```

## Edge cases & variants

| Input | Output | Note |
|---|---|---|
| `{}` | `{}` | nothing to flatten |
| `{ a: null }` | `{ a: null }` | check `null` before `typeof` |
| `{ a: {}, b: [] }` | `{ a: {}, b: [] }` | kept, so no data is lost |
| `{ a: { b: { c: { d: 1 } } } }` | `{ 'a.b.c.d': 1 }` | any depth |
| keys that contain a dot, like `{ 'x.y': 1 }` | `{ 'x.y': 1 }` | can't be unflattened correctly, so mention it as a limitation |

**Variants interviewers ask for:**

- **A custom separator:** `flattenObject(obj, '_')` gives `a_b_c`.
- **Bracket notation for arrays:** `tags[0]` instead of `tags.0`.
- **Skip empty objects** instead of keeping them.
- **Circular references:** track visited objects in a `WeakSet` (same idea as deep clone).

## 🎯 Interview answer

> "I solve it recursively, passing down the path so far and a shared result object. For each entry, I build the path by joining the prefix and key with a dot. If the value is a non-null object or array with at least one key, I recurse into it with the new path; otherwise it's a leaf and I store it under that path. Checking null first matters because `typeof null` is 'object', and using `Object.entries` means arrays naturally get index keys like `tags.0`. Keeping empty objects as values means nothing is lost. It's O(n) time. For very deep input I can use an explicit stack instead of recursion, and the usual follow-up is unflatten: split each key on dots and walk down, creating objects or arrays, depending on whether the next key is numeric, before setting the value."
