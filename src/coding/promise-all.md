## Problem

Write `promiseAll(items)`, your own version of **`Promise.all`**. It returns a **promise** that:

- **Resolves** with an array of all the results, **in the same order as the input**, once **every** item has resolved.
- **Rejects** as soon as **any** item rejects, with that error.
- **Accepts plain values too:** non-promises count as already resolved.
- **Resolves to `[]`** for an empty array.

## Examples

```js
const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))

await promiseAll([wait(30, 'a'), wait(10, 'b'), 'c'])
// ['a', 'b', 'c']   ← input order, even though 'b' finished first

await promiseAll([])
// []

await promiseAll([wait(10, 1), Promise.reject(new Error('boom'))])
// ❌ rejects with Error: boom
```

## Hints

1. **Return `new Promise((resolve, reject) => ...)`.**
2. **Store each result at its index** (`results[i] = value`), not with `push`, because they finish in any order.
3. **Count how many have finished.** When the count equals the length, resolve.

<!-- SOLUTION -->

## Solution

```js
function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const results = []
    let completed = 0

    if (items.length === 0) {
      resolve([])                         // nothing to wait for
      return
    }

    items.forEach((item, index) => {
      Promise.resolve(item)               // wraps plain values into promises
        .then((value) => {
          results[index] = value          // ⭐ keep input order
          completed++
          if (completed === items.length) resolve(results)
        })
        .catch(reject)                    // first rejection rejects everything
    })
  })
}
```

**Step by step for `[wait(30,'a'), wait(10,'b'), 'c']`:**

```
start: results [], completed 0
'c' resolves first (plain value)  → results[2] = 'c'  completed 1
t=10ms 'b' resolves               → results[1] = 'b'  completed 2
t=30ms 'a' resolves               → results[0] = 'a'  completed 3 === 3 → resolve(['a','b','c']) ✅
```

## Key points

| Point | Why |
|---|---|
| `results[index] = value` | Promises finish in **any order**; `push` would mix up the order |
| A counter, not `results.length` | Assigning `results[2]` first makes `length` 3 straight away, even though only 1 has finished |
| `Promise.resolve(item)` | Handles plain values and "thenables" the same way |
| Empty array check | Otherwise it would **never** resolve |
| `.catch(reject)` | Calling `reject` more than once is harmless: a promise settles only once |

**With async/await** (shorter, but runs the `await`s one after another for **reading**, while the promises themselves still run in parallel):

```js
async function promiseAll(items) {
  const results = []
  for (const item of items) results.push(await item)
  return results
}
```

This works for success, but **rejection timing differs**: it only notices a rejection when it reaches that item. Interviewers expect the `new Promise` + counter version.

## Related methods

| Method | Resolves when | Rejects when |
|---|---|---|
| **`Promise.all`** | **all** succeed → array of values | **any** fails |
| **`Promise.allSettled`** | **all** finish (success or failure) → `[{status, value/reason}]` | never |
| **`Promise.race`** | the **first** to settle succeeds | the first to settle fails |
| **`Promise.any`** | the **first** to succeed | **all** fail → `AggregateError` |

**Follow-up:** "Implement `allSettled`": same counter pattern, but store `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` and **never reject**.

## 🎯 Interview answer

> "I return a new Promise. Inside, I keep a results array and a completed counter, resolving immediately with an empty array if there are no items. For each item I call `Promise.resolve(item)` so plain values work too, and in `.then` I store the value at its original index, since promises can finish in any order, increment the counter, and resolve with the results once the counter equals the input length. I use a counter rather than `results.length`, because assigning a later index first changes the length. Any rejection calls `reject`, which settles the whole promise with the first error. `allSettled` is the same pattern but records each outcome and never rejects."
