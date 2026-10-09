## Problem

Write `memoize(fn)` that returns a **new function** which **remembers results**. If it's called again with the **same arguments**, it returns the **saved result** instead of running `fn` again.

## Examples

```js
let calls = 0
const square = (n) => { calls++; return n * n }

const fastSquare = memoize(square)
fastSquare(4)   // 16 (computed, calls = 1)
fastSquare(4)   // 16 (from cache, calls still 1)
fastSquare(5)   // 25 (computed, calls = 2)

const add = memoize((a, b) => a + b)
add(1, 2)       // 3 (computed)
add(1, 2)       // 3 (cached)
add(2, 1)       // 3 (different arguments → computed)
```

## Hints

1. **Store results in a cache** that lives in a closure: a `Map` or an object.
2. **The cache key must represent all the arguments.** How can you turn `(1, 2)` into one key?

<!-- SOLUTION -->

## Solution

```js
function memoize(fn) {
  const cache = new Map()                  // lives in the closure

  return function (...args) {
    const key = JSON.stringify(args)       // (1, 2) → "[1,2]"
    if (cache.has(key)) return cache.get(key)

    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}
```

**Step by step:**

```
fastSquare(4) → key "[4]" → not in cache → compute 16 → cache {"[4]": 16}
fastSquare(4) → key "[4]" → in cache → return 16 (fn NOT called)
fastSquare(5) → key "[5]" → compute 25 → cache {"[4]": 16, "[5]": 25}
```

**Why `cache.has` and not `if (cache.get(key))`?** A cached result could be `0`, `''` or `false`, which are falsy and would be recomputed every time.

## Memoized Fibonacci

**The classic demo:** naive recursive Fibonacci recomputes the same values exponentially many times.

```js
// ❌ O(2^n): fib(40) takes seconds
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2)
}

// ✅ O(n): each value computed once
const memoFib = memoize((n) => (n < 2 ? n : memoFib(n - 1) + memoFib(n - 2)))
memoFib(50)   // 12586269025, instantly
```

**Important:** the recursive calls must call **`memoFib`** (the memoized version), not the original, or the cache is never used for the inner calls.

## Limits & follow-ups

| Issue | Detail |
|---|---|
| **Only for pure functions** | Same input must always give the same output (no `Math.random()`, no API calls that change) |
| **`JSON.stringify` keys** | Functions and `undefined` disappear, and objects with the same content but different identity share a key. A custom `resolver` function can build better keys. |
| **Memory grows forever** | Add a size limit (LRU cache) or let the caller clear it |
| **Single primitive argument** | Can use the argument itself as the Map key, which is faster |

**In React, this is the same idea as** `useMemo`, `useCallback`, `React.memo` and the React Compiler: reuse a previous result when the inputs haven't changed.

## 🎯 Interview answer

> "Memoize returns a wrapper with a cache in its closure, usually a Map. On each call I build a key from the arguments, for example with `JSON.stringify(args)`; if the key is in the cache I return the stored result, otherwise I call `fn.apply(this, args)`, store the result and return it. I check with `cache.has` so falsy results like 0 are still cached. It only makes sense for pure functions, and the cache grows unbounded, so in real code I'd consider a size limit or a custom key resolver. The classic example is Fibonacci, which drops from exponential to linear time when the recursive calls go through the memoized function."
