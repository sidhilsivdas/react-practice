## Problem

Write `sortByAge(people, order = 'asc')` that returns a **new array** of people sorted by their `age` property.

- **`order`** is `'asc'` (youngest first, the default) or `'desc'` (oldest first).
- **It must run in O(n log n).**
- **Don't change the original array** (in React, props and state must never be mutated).
- **People with the same age keep their original order** (a "stable" sort).

## Examples

```js
const people = [
  { name: 'Sam', age: 32 },
  { name: 'Priya', age: 25 },
  { name: 'Alex', age: 41 },
  { name: 'Mia', age: 25 },
]

sortByAge(people)
// [Priya 25, Mia 25, Sam 32, Alex 41]   ← Priya stays before Mia (same age)

sortByAge(people, 'desc')
// [Alex 41, Sam 32, Priya 25, Mia 25]

people   // unchanged: [Sam, Priya, Alex, Mia]
```

## Hints

1. **`sort()` needs a compare function for numbers.** Without one, it compares them as **text**.
2. **`sort()` changes the array it's called on.** How do you sort a copy?
3. **For descending, you don't need a second function:** multiply the result by `-1`.

<!-- SOLUTION -->

## Built-in sort

```js
function sortByAge(people, order = 'asc') {
  const direction = order === 'asc' ? 1 : -1
  return [...people].sort((a, b) => (a.age - b.age) * direction)   // copy first: don't mutate
}

// ES2023: toSorted() returns a new array, no copy needed
const sorted = people.toSorted((a, b) => a.age - b.age)
```

**How the compare function works:**

| `compare(a, b)` returns | Result |
|---|---|
| negative (e.g. `25 - 32 = -7`) | `a` comes first |
| positive | `b` comes first |
| `0` | keep their current order |

- **Why it's O(n log n):** V8 (Chrome, Edge, Node) implements `Array.prototype.sort` with **TimSort**, which is O(n log n) in the worst case.
- **Since ES2019, `sort` is required to be stable**, so equal ages keep their original order.
- **`[...people]` or `toSorted()`:** `sort()` works **in place** and would change the caller's array, which is a classic React bug (state changes without React noticing).

## In a React component

```jsx
import { useMemo, useState } from 'react'

export default function PeopleList({ people }) {
  const [order, setOrder] = useState('asc')

  // re-sort only when the list or the order changes, not on every render
  const sortedPeople = useMemo(() => sortByAge(people, order), [people, order])

  return (
    <>
      <button onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}>
        Sort by age ({order === 'asc' ? 'youngest first' : 'oldest first'})
      </button>
      <ul>
        {sortedPeople.map((p) => (
          <li key={p.id}>{p.name}: {p.age}</li>
        ))}
      </ul>
    </>
  )
}
```

- **`useMemo`** avoids re-sorting on unrelated re-renders. For small lists it hardly matters; for thousands of rows it does.
- **Keys use a stable `id`**, not the index, because sorting changes the positions.

## Merge sort (no built-in)

**If the interviewer says "implement the sort yourself in O(n log n)":**

```js
function sortByAge(people, order = 'asc') {
  const direction = order === 'asc' ? 1 : -1

  function mergeSort(arr) {
    if (arr.length <= 1) return arr
    const mid = Math.floor(arr.length / 2)
    return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)))   // slice → original untouched
  }

  function merge(left, right) {
    const result = []
    let i = 0
    let j = 0
    while (i < left.length && j < right.length) {
      // <= takes from the LEFT on ties, which keeps equal ages in their original order (stable)
      if ((left[i].age - right[j].age) * direction <= 0) result.push(left[i++])
      else result.push(right[j++])
    }
    return result.concat(left.slice(i), right.slice(j))
  }

  return mergeSort(people)
}
```

**Step by step for ages `[32, 25, 41, 25]`:**

```
split:   [32, 25]          [41, 25]
split:   [32] [25]         [41] [25]
merge:   [25, 32]          [25, 41]
merge:   [25, 25, 32, 41]     ← compare 25 vs 25: take LEFT first (stable)
```

- **Splitting** halves the array each time: **log n levels**.
- **Merging** handles all n items once per level: **O(n) per level**.
- **Total: O(n log n) time in every case**, and O(n) extra space.

## Complexity

| Algorithm | Best | Average | Worst | Stable? | Notes |
|---|---|---|---|---|---|
| **Built-in `sort` (TimSort)** | O(n) | O(n log n) | **O(n log n)** | ✅ | ⭐ use this in real code |
| **Merge sort** | O(n log n) | O(n log n) | **O(n log n)** | ✅ | the classic "write it yourself" answer |
| Quick sort | O(n log n) | O(n log n) | ❌ O(n²) | ❌ | fast in practice, but not guaranteed |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | ❌ | in place, but unstable |
| Bubble / insertion sort | O(n) | O(n²) | O(n²) | ✅ | ❌ too slow for this problem |

**TimSort's O(n) best case** comes from detecting already-sorted runs, which is common with real data.

## Edge cases

| Case | Handling |
|---|---|
| Empty array / one person | return a new array (`[]` / a one-item copy) |
| Equal ages | keep the original order (stable) |
| `sort()` with no compare function | ❌ sorts as text: `[100, 25, 9]` stays `[100, 25, 9]` because "1" < "2" < "9" |
| Descending with `.reverse()` | ❌ sorting ascending then reversing **flips equal ages too** (Mia before Priya), so it's no longer stable. Flip the comparator instead: `(b.age - a.age)` or `* -1` |
| Ages stored as strings (`"25"`) | `Number(a.age) - Number(b.age)` |
| Missing age | `(a.age ?? Infinity) - (b.age ?? Infinity)` puts them last |
| Same age, sort by name next | `a.age - b.age \|\| a.name.localeCompare(b.name)` |
| Sorting by any key | `const sortBy = (key) => (a, b) => a[key] - b[key]` |

## 🎯 Interview answer

> "I'd return a sorted copy using the built-in sort with a numeric comparator: `[...people].sort((a, b) => (a.age - b.age) * direction)`, where direction is 1 for ascending and -1 for descending, or `toSorted` in modern environments. Copying matters because sort mutates in place, and in React that would change props or state without React noticing. V8 implements sort with TimSort, so it's O(n log n) in the worst case, and since ES2019 it's guaranteed stable, so people with the same age keep their order. Without a comparator, sort compares as strings, which breaks numbers. In a component I'd wrap it in `useMemo` keyed on the list and the order, and use stable ids as keys. If asked to implement it myself, I'd write merge sort: split recursively for log n levels and merge each level in O(n), for O(n log n) time and O(n) space, taking from the left side on ties to keep it stable."
