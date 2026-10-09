## Problem

Write `curry(fn)` that turns a function taking several arguments into one you can call **with the arguments split up in any groups**. It runs `fn` once **enough arguments** have been collected (`fn.length`).

## Examples

```js
const add3 = (a, b, c) => a + b + c
const curried = curry(add3)

curried(1)(2)(3)     // 6
curried(1, 2)(3)     // 6
curried(1)(2, 3)     // 6
curried(1, 2, 3)     // 6
```

**Real use:** pre-filling arguments to create specialised functions:

```js
const log = curry((level, message) => console.log(`[${level}] ${message}`))
const logError = log('ERROR')
logError('Disk full')    // [ERROR] Disk full
```

## Hints

1. **`fn.length`** tells you how many parameters `fn` expects.
2. **Collect arguments.** If you have enough, call `fn`. If not, **return another function** that collects more.

<!-- SOLUTION -->

## Solution

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args)                       // enough arguments → run it
    }
    return (...moreArgs) => curried.apply(this, [...args, ...moreArgs])   // not yet → wait for more
  }
}
```

**Step by step for `curried(1)(2, 3)`:**

```
curried(1)       → args [1], need 3 → return a function remembering [1]
  (2, 3)         → curried(1, 2, 3) → args [1, 2, 3], 3 >= 3 → add3(1, 2, 3) = 6 ✅
```

**Key ideas:**

- **`fn.length`** = the number of declared parameters (`(a, b, c) => ...` gives 3).
- **Closures** remember the arguments collected so far.
- **Recursion:** each partial call returns `curried` again, with the combined arguments.

## Infinite sum

**A famous variant:** `sum(1)(2)(3)()` returns `6`. Keep adding until called with **no arguments**:

```js
function sum(a) {
  return function next(b) {
    if (b === undefined) return a      // empty call → done
    return sum(a + b)
  }
}

sum(1)(2)(3)()    // 6
sum(5)(10)()      // 15
```

## Gotchas

| Gotcha | Detail |
|---|---|
| **Default and rest parameters** | `fn.length` doesn't count them: `((a, b = 2) => ...).length` is `1`, and `((...args) => ...).length` is `0` |
| **Currying vs partial application** | Currying = one argument at a time, in a chain. Partial application = pre-fill some arguments (`fn.bind(null, 1)`). This `curry` supports both styles. |

**Where it's used:** functional libraries (Ramda, lodash `_.curry`), Redux middleware's `store => next => action` signature, and event handlers like `onClick={handleSelect(id)}` that return a function.

## 🎯 Interview answer

> "Curry returns a function that collects arguments across calls. Each call compares the number of collected arguments with `fn.length`, the number of parameters the original function declares. If there are enough, it calls `fn` with them; otherwise it returns a new function that, when called, merges the old and new arguments and calls `curried` again. The collected arguments live in closures, so `curried(1)(2)(3)`, `curried(1, 2)(3)` and `curried(1, 2, 3)` all work. A caveat is that `fn.length` ignores default and rest parameters. A related puzzle is an infinite `sum(1)(2)(3)()`, which keeps returning a function until it's called with no argument."
