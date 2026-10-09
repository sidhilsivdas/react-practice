## Problem

Write `chunk(arr, size)` that splits an array into **groups of `size`** items. The last group holds whatever is left over.

## Examples

```js
chunk([1, 2, 3, 4, 5], 2)    // [[1, 2], [3, 4], [5]]
chunk([1, 2, 3, 4], 2)       // [[1, 2], [3, 4]]
chunk(['a', 'b', 'c'], 1)    // [['a'], ['b'], ['c']]
chunk([1, 2], 5)             // [[1, 2]]
chunk([], 3)                 // []
```

## Hints

1. **Jump through the array `size` steps at a time.**
2. **`arr.slice(start, end)`** returns a piece without changing the original.

<!-- SOLUTION -->

## slice in steps

```js
function chunk(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))   // slice stops at the end automatically
  }
  return result
}
```

**Step by step for `[1, 2, 3, 4, 5]`, size `2`:**

```
i=0 → slice(0, 2) → [1, 2]
i=2 → slice(2, 4) → [3, 4]
i=4 → slice(4, 6) → [5]      (only one left)
i=6 → stop
→ [[1, 2], [3, 4], [5]] ✅
```

- **Time: O(n). Space: O(n)** for the result.
- **`slice` doesn't mutate**, so the original array is untouched.

## Build as you go

**Another common answer:** fill the current chunk until it's full.

```js
function chunk(arr, size) {
  const result = []
  let current = []

  for (const item of arr) {
    current.push(item)
    if (current.length === size) {
      result.push(current)
      current = []
    }
  }
  if (current.length) result.push(current)   // leftover items
  return result
}
```

## Edge cases & uses

| Input | Expected |
|---|---|
| `[]`, any size | `[]` |
| size bigger than the array | one chunk with everything |
| size `1` | each item in its own array |
| size `0` or negative | invalid: return `[]` or throw (ask the interviewer) |

**Real-world uses:**

- **Pagination:** `chunk(items, 10)[pageIndex]`.
- **Grid layouts:** rows of 3 cards.
- **Batching API requests:** send 100 IDs at a time.

## 🎯 Interview answer

> "I loop with the index jumping by `size` each time, and push `arr.slice(i, i + size)` into the result. Slice doesn't mutate the original and naturally stops at the end of the array, so the last chunk just holds the remaining items. That's O(n) time. An alternative is building the current chunk item by item and pushing it when it's full, then pushing any leftovers at the end. I'd also clarify how to handle a size of zero, since that would loop forever with the step approach."
