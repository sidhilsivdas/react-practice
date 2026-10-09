## Problem

Write `flatten(arr)` that takes an array which may contain **nested arrays at any depth** and returns a **new, single-level array** with all the values in order.

**Don't use** the built-in `arr.flat()`. Interviewers want to see you write it yourself.

## Examples

```js
flatten([1, [2, 3]])                 // [1, 2, 3]
flatten([1, [2, [3, [4]], 5]])       // [1, 2, 3, 4, 5]
flatten([[[]]])                      // []
flatten(['a', ['b', ['c']]])         // ['a', 'b', 'c']
```

## Hints

1. **For each item:** is it an array? (`Array.isArray`)
2. **If yes, flatten it too** (recursion), and add its items. If not, add the item itself.

<!-- SOLUTION -->

## Recursion

```js
function flatten(arr) {
  const result = []

  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flatten(item))   // flatten the inner array, then add its items
    } else {
      result.push(item)
    }
  }
  return result
}
```

**Step by step for `[1, [2, [3]]]`:**

```
item 1        → push 1                    result [1]
item [2, [3]] → flatten([2, [3]])
                  item 2   → push 2
                  item [3] → flatten([3]) → [3] → push 3
                  returns [2, 3]
              → push ...[2, 3]            result [1, 2, 3] ✅
```

**The same thing with `reduce`** (a popular one-liner):

```js
const flatten = (arr) =>
  arr.reduce((flat, item) => flat.concat(Array.isArray(item) ? flatten(item) : item), [])
```

- **Time: O(n)** for n total values. **Space:** O(depth) for the recursion.

## Iterative (stack)

**No recursion**, so very deep arrays can't overflow the call stack:

```js
function flatten(arr) {
  const stack = [...arr]
  const result = []

  while (stack.length) {
    const item = stack.pop()             // take from the END
    if (Array.isArray(item)) {
      stack.push(...item)                // unpack it back onto the stack
    } else {
      result.push(item)
    }
  }
  return result.reverse()                // we worked backwards, so reverse
}
```

## With a depth limit

**Follow-up: "Implement `arr.flat(depth)`"**, which only flattens `depth` levels:

```js
function flattenDepth(arr, depth = 1) {
  if (depth < 1) return arr.slice()
  return arr.reduce(
    (flat, item) => flat.concat(Array.isArray(item) ? flattenDepth(item, depth - 1) : item),
    []
  )
}

flattenDepth([1, [2, [3, [4]]]], 1)   // [1, 2, [3, [4]]]
flattenDepth([1, [2, [3, [4]]]], 2)   // [1, 2, 3, [4]]
```

**Built-in:** `arr.flat()` flattens one level, and `arr.flat(Infinity)` flattens everything.

## 🎯 Interview answer

> "I loop over the array, and for each item I check `Array.isArray`: if it's an array, I recursively flatten it and spread its items into the result, otherwise I push the item. That's O(n) for n values. The same idea fits in a `reduce` with `concat`. To avoid stack overflow on extremely deep arrays, I can do it iteratively with a stack, popping items, pushing arrays' contents back on, and reversing at the end. For `flat(depth)`, I pass a depth counter down and stop recursing when it reaches zero."
