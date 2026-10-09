## Problem

Write a function `removeDuplicates(arr)` that returns a **new array** with every duplicate removed, **keeping the first time** each value appears, in the original order.

- **Don't change** the original array.
- `1` and `'1'` are **different** values (number vs string).
- Treat `NaN` as equal to `NaN`.

## Examples

```js
removeDuplicates([1, 2, 2, 3, 1])         // [1, 2, 3]
removeDuplicates(['a', 'b', 'a', 'c'])    // ['a', 'b', 'c']
removeDuplicates([1, '1', 1])             // [1, '1']
removeDuplicates([NaN, 1, NaN])           // [NaN, 1]
removeDuplicates([])                      // []
```

## Hints

1. **Which built-in collection only stores unique values?**
2. **Without it:** loop through the array and remember what you've already seen.
3. **Watch out:** `[NaN].indexOf(NaN)` is `-1`, and object keys turn `1` into `'1'`.

<!-- SOLUTION -->

## Set (best)

A **`Set` only keeps unique values**, and it remembers the **insertion order**. Spread it back into an array:

```js
function removeDuplicates(arr) {
  return [...new Set(arr)]
}
// or: Array.from(new Set(arr))
```

**Step by step for `[1, 2, 2, 3, 1]`:**

```
new Set([1, 2, 2, 3, 1])
  add 1 → {1}
  add 2 → {1, 2}
  add 2 → already there, skipped
  add 3 → {1, 2, 3}
  add 1 → already there, skipped
[...set] → [1, 2, 3] ✅
```

- **Time: O(n).** Checking a `Set` is O(1) on average.
- **Space: O(n)** for the set.
- **`Set` uses "SameValueZero" equality**, so `NaN` equals `NaN`, and `1` and `'1'` stay different. ✅ It passes every example.

## filter + indexOf

**Keep an item only if this is the first position where it appears:**

```js
function removeDuplicates(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index)
}
```

```
[1, 2, 2, 3, 1]
 i=0: indexOf(1) = 0 → 0 === 0 keep ✅
 i=1: indexOf(2) = 1 → keep ✅
 i=2: indexOf(2) = 1 → 1 !== 2 drop ❌
 i=3: indexOf(3) = 3 → keep ✅
 i=4: indexOf(1) = 0 → drop ❌
→ [1, 2, 3]
```

- **Time: O(n²).** `indexOf` scans the array for **every** item.
- **⚠️ NaN bug:** `indexOf` uses `===`, and `NaN === NaN` is `false`. So `indexOf(NaN)` is always `-1`, and **every `NaN` is removed**: `[NaN, 1, NaN]` gives `[1]` ❌.
- **Very common in interviews**, so know it and its bug.

## Loop + seen

**Without built-in tricks:** remember what you've seen while looping. This is what interviewers want when they say **"don't use Set"**.

```js
function removeDuplicates(arr) {
  const seen = {}
  const result = []

  for (const item of arr) {
    const key = typeof item + ':' + item   // "number:1" vs "string:1"
    if (!seen[key]) {
      seen[key] = true
      result.push(item)
    }
  }
  return result
}
```

- **Time: O(n). Space: O(n).**
- **Why `typeof item + ':' + item`?** Object keys are **always strings**, so `seen[1]` and `seen['1']` are **the same key**. Without the type prefix, `[1, '1']` would become `[1]` ❌. Adding the type keeps them apart, and `'number:NaN'` makes NaN work too.
- **If `Set` is allowed but you want a loop**, use a `Set` as `seen` instead: `if (!seen.has(item)) { seen.add(item); result.push(item) }`.

## reduce

```js
function removeDuplicates(arr) {
  return arr.reduce((unique, item) => (unique.includes(item) ? unique : [...unique, item]), [])
}
```

- **`includes` handles `NaN` correctly** (unlike `indexOf`).
- **But it's O(n²)**: `includes` scans the result each time, and `[...unique, item]` copies the array each time. Fine to show, not great for big arrays.

## Objects by key

**A very common real-world follow-up:** remove duplicate **objects** by a property like `id`.

```js
const users = [
  { id: 1, name: 'Sam' },
  { id: 2, name: 'Priya' },
  { id: 1, name: 'Sam (copy)' },
]
```

**`new Set(users)` doesn't work**, because every object is a **different reference**, even with the same content.

✅ **Keep the first object for each id:**

```js
function uniqueBy(arr, key) {
  const seen = new Set()
  return arr.filter((item) => {
    if (seen.has(item[key])) return false
    seen.add(item[key])
    return true
  })
}

uniqueBy(users, 'id')   // [{ id: 1, name: 'Sam' }, { id: 2, name: 'Priya' }]
```

**Shorter, with a `Map`:**

```js
[...new Map(users.map((u) => [u.id, u])).values()]
// [{ id: 1, name: 'Sam (copy)' }, { id: 2, name: 'Priya' }]
```

⚠️ The `Map` version keeps the **last** object for each id (a later `set` overwrites the value), in the position where that id first appeared.

## Comparison

| Approach | Time | NaN correct? | `1` vs `'1'` correct? | Notes |
|---|---|---|---|---|
| **`[...new Set(arr)]`** | **O(n)** | ✅ | ✅ | ⭐ best answer |
| `filter` + `indexOf` | O(n²) | ❌ removes all NaN | ✅ | most commonly asked |
| Loop + `seen` object | O(n) | ✅ (with type prefix) | ✅ (with type prefix) | "without Set" answer |
| `reduce` + `includes` | O(n²) | ✅ | ✅ | readable, slow |

## Edge cases

| Input | Expected | Trap |
|---|---|---|
| `[]` | `[]` | don't crash on empty input |
| `[5, 5, 5]` | `[5]` | all the same |
| `[1, '1']` | `[1, '1']` | object keys coerce to strings |
| `[NaN, NaN]` | `[NaN]` | `indexOf(NaN)` is `-1` |
| `[{ a: 1 }, { a: 1 }]` | both kept | objects compare by reference |
| `['A', 'a']` | both kept | case-sensitive (normalise if the interviewer wants otherwise) |

## Follow-ups

**Find the duplicate values (not remove them):**

```js
function findDuplicates(arr) {
  const counts = new Map()
  for (const item of arr) counts.set(item, (counts.get(item) || 0) + 1)
  return [...counts].filter(([, count]) => count > 1).map(([item]) => item)
}

findDuplicates([1, 2, 2, 3, 3, 3])   // [2, 3]
```

**Remove duplicates from a sorted array in place** (LeetCode 26), with two pointers, O(1) extra space:

```js
function removeDuplicatesSorted(nums) {
  let k = 1                                   // next position for a unique value
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[k - 1]) nums[k++] = nums[i]
  }
  return k                                    // first k items are unique
}
```

## In React

**Show unique tags from a list of posts**, recalculated only when the posts change:

```jsx
function TagList({ posts }) {
  const tags = useMemo(() => [...new Set(posts.flatMap((p) => p.tags))], [posts])

  return tags.map((tag) => <span key={tag}>{tag}</span>)   // unique values make safe keys
}
```

**Remember:** duplicate items with the same `key` cause React warnings and rendering bugs, so de-duplicate data before rendering lists.

## 🎯 Interview answer

> "The simplest and fastest way is `[...new Set(arr)]`: a Set only stores unique values and keeps insertion order, so it's O(n), and it uses SameValueZero equality, so NaN is handled and `1` and `'1'` stay distinct. A common alternative is `arr.filter((item, i) => arr.indexOf(item) === i)`, which keeps only the first occurrence but is O(n²), and it drops every NaN because `indexOf` uses strict equality. If I can't use Set, I loop once with a `seen` object and push values I haven't seen, using `typeof item + ':' + item` as the key, because object keys are strings and would otherwise treat `1` and `'1'` as the same. For arrays of objects, Set doesn't help because objects compare by reference, so I track a key like `id` in a Set and filter."
