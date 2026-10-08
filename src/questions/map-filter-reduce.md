## Short answer

All three **loop over an array and return something new, without changing the original.**

| Method | Question it answers | Returns | Length |
|---|---|---|---|
| **`map`** | "Transform each item" | **New array** | **Same** as the original |
| **`filter`** | "Keep only some items" | **New array** | **Same or shorter** |
| **`reduce`** | "Combine everything into one value" | **Anything**: number, object, array | — |

**Analogy: a fruit juice factory** 🍎

- **`map`:** **peel** every fruit. 5 fruits in, 5 peeled fruits out.
- **`filter`:** **throw away** the rotten ones. 5 in, maybe 3 out.
- **`reduce`:** **blend** them all into **one glass of juice**.

```js
const nums = [1, 2, 3, 4, 5]

nums.map((n) => n * 2)              // [2, 4, 6, 8, 10]
nums.filter((n) => n % 2 === 0)     // [2, 4]
nums.reduce((sum, n) => sum + n, 0) // 15

nums  // [1, 2, 3, 4, 5]  ← unchanged
```

---

## map

```js
array.map((item, index, array) => newItem)
```

```js
// Extract one field
const users = [{ name: 'Sam', age: 25 }, { name: 'Priya', age: 30 }]
users.map((u) => u.name)                 // ['Sam', 'Priya']

// Add or modify a field (immutably)
users.map((u) => ({ ...u, isAdult: u.age >= 18 }))

// Use the index
['a', 'b', 'c'].map((letter, i) => `${i + 1}. ${letter}`)   // ['1. a', '2. b', '3. c']
```

### In React: rendering lists

```jsx
<ul>
  {users.map((user) => (
    <li key={user.id}>{user.name}</li>
  ))}
</ul>
```

---

## filter

```js
array.filter((item, index, array) => true /* keep */ or false /* drop */)
```

```js
const products = [
  { name: 'Phone', price: 500, inStock: true },
  { name: 'Laptop', price: 1200, inStock: false },
  { name: 'Mouse', price: 25, inStock: true },
]

products.filter((p) => p.inStock)           // Phone, Mouse
products.filter((p) => p.price < 100)       // Mouse

// Search
products.filter((p) => p.name.toLowerCase().includes('pho'))   // Phone

// Remove falsy values ⭐
[0, 1, '', 'hi', null, undefined, NaN, false].filter(Boolean)  // [1, 'hi']
```

### In React: removing an item from state

```jsx
const deleteTodo = (id) => {
  setTodos(todos.filter((todo) => todo.id !== id))
}
```

---

## reduce

```js
array.reduce((accumulator, item, index, array) => newAccumulator, initialValue)
```

- **`accumulator`** is the **running result**, carried from one step to the next.
- **`initialValue`** is the accumulator's **starting value**.

```js
[1, 2, 3, 4].reduce((sum, n) => sum + n, 0)
```

| Step | `sum` (before) | `n` | Returns |
|---|---|---|---|
| 1 | `0` (initial) | 1 | 1 |
| 2 | 1 | 2 | 3 |
| 3 | 3 | 3 | 6 |
| 4 | 6 | 4 | **10** ✅ |

**`reduce` can do what `map` and `filter` do:**

```js
// map with reduce
[1, 2, 3].reduce((acc, n) => [...acc, n * 2], [])                  // [2, 4, 6]

// filter with reduce
[1, 2, 3, 4].reduce((acc, n) => (n % 2 ? acc : [...acc, n]), [])    // [2, 4]
```

---

## reduce examples

```js
// 1. Sum / total price of a cart
const cart = [{ price: 100, qty: 2 }, { price: 50, qty: 1 }]
cart.reduce((total, item) => total + item.price * item.qty, 0)   // 250

// 2. Max value
[3, 9, 2, 7].reduce((max, n) => (n > max ? n : max))              // 9
// (or Math.max(...arr))

// 3. Count occurrences ⭐⭐ (very common)
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple']
fruits.reduce((count, fruit) => {
  count[fruit] = (count[fruit] || 0) + 1
  return count
}, {})
// { apple: 3, banana: 2, orange: 1 }

// 4. Group by a property ⭐⭐
const people = [
  { name: 'Sam', dept: 'IT' },
  { name: 'Priya', dept: 'HR' },
  { name: 'Alex', dept: 'IT' },
]
people.reduce((groups, person) => {
  (groups[person.dept] ||= []).push(person)
  return groups
}, {})
// { IT: [Sam, Alex], HR: [Priya] }
// Modern alternative: Object.groupBy(people, (p) => p.dept)

// 5. Array → object lookup by id
const users = [{ id: 1, name: 'Sam' }, { id: 2, name: 'Priya' }]
users.reduce((byId, user) => ({ ...byId, [user.id]: user }), {})
// { 1: {id: 1, name: 'Sam'}, 2: {id: 2, name: 'Priya'} }

// 6. Flatten nested arrays ⭐
const flatten = (arr) =>
  arr.reduce((flat, item) => flat.concat(Array.isArray(item) ? flatten(item) : item), [])
flatten([1, [2, [3, [4]]], 5])   // [1, 2, 3, 4, 5]
// (or arr.flat(Infinity))

// 7. Remove duplicates
[1, 2, 2, 3, 3, 3].reduce((unique, n) => (unique.includes(n) ? unique : [...unique, n]), [])
// [1, 2, 3]   (or [...new Set(arr)])

// 8. Compose / pipe functions (advanced) ⭐
const pipe = (...fns) => (x) => fns.reduce((value, fn) => fn(value), x)
const add2 = (n) => n + 2
const double = (n) => n * 2
pipe(add2, double)(5)   // (5 + 2) * 2 = 14

// 9. Run promises in sequence (advanced)
const ids = [1, 2, 3]
ids.reduce((chain, id) => chain.then(() => fetchUser(id)), Promise.resolve())
// fetches 1, then 2, then 3, one after another
```

---

## Chaining

```js
const orders = [
  { item: 'Phone', price: 500, status: 'delivered' },
  { item: 'Case', price: 20, status: 'cancelled' },
  { item: 'Charger', price: 30, status: 'delivered' },
]

// "Total of delivered orders, with 10% tax"
orders
  .filter((o) => o.status === 'delivered')   // Phone, Charger
  .map((o) => o.price * 1.1)                 // [550, 33]
  .reduce((sum, p) => sum + p, 0)            // 583
```

**Readable, but it loops 3 times.** For huge arrays, one `reduce` does it in a single pass:

```js
orders.reduce((sum, o) => (o.status === 'delivered' ? sum + o.price * 1.1 : sum), 0)
```

---

## Trick questions

### `['1', '2', '3'].map(parseInt)`

```js
['1', '2', '3'].map(parseInt)   // [1, NaN, NaN] 😵
```

**Why:** `map` passes **`(item, index)`**, and `parseInt` takes **`(string, radix)`**:

```js
parseInt('1', 0)   // 1   (radix 0 = auto → base 10)
parseInt('2', 1)   // NaN (base 1 doesn't exist)
parseInt('3', 2)   // NaN (base 2 only has digits 0 and 1)
```

✅ **Fix:** `['1', '2', '3'].map(Number)` or `.map((s) => parseInt(s, 10))`.

### Forgetting `return` with curly braces

```js
[1, 2, 3].map((n) => { n * 2 })         // [undefined, undefined, undefined] ❌
[1, 2, 3].map((n) => n * 2)             // [2, 4, 6] ✅ implicit return
[1, 2, 3].map((n) => { return n * 2 })  // [2, 4, 6] ✅

// Returning an object needs parentheses:
users.map((u) => { name: u.name })     // [undefined, ...] ❌ treated as a code block
users.map((u) => ({ name: u.name }))   // ✅
```

### `reduce` without an initial value

```js
[].reduce((a, b) => a + b)             // ❌ TypeError: Reduce of empty array with no initial value
[].reduce((a, b) => a + b, 0)          // 0 ✅

[5].reduce((a, b) => a + b)            // 5 (callback never runs)
[1, 2, 3].reduce((a, b) => a + b, '')  // "123" (initial is a string, so it concatenates)
```

**Rule: always pass an initial value.**

### Forgetting to return the accumulator

```js
fruits.reduce((count, f) => {
  count[f] = (count[f] || 0) + 1
  // ❌ forgot "return count" → next step gets undefined → crash
}, {})
```

### Mutating inside `map` ⚠️ (a React bug)

```js
const todos = [{ id: 1, done: false }]

const updated = todos.map((t) => {
  t.done = true          // ❌ changes the ORIGINAL object
  return t
})
todos[0].done            // true 😱  the original was changed too
```

**`map` creates a new array, but the objects inside are the same objects.** React may not detect the change.

```js
todos.map((t) => ({ ...t, done: true }))   // ✅ new objects
```

### Sparse arrays (holes)

```js
[1, , 3].map((n) => n * 2)   // [2, empty, 6]: holes are skipped
```

---

## map vs forEach

| | `map` | `forEach` |
|---|---|---|
| Returns | **New array** | `undefined` |
| Chainable | ✅ | ❌ |
| Use for | **Transforming** data | **Side effects**: logging, saving |
| Can you `break`? | ❌ | ❌ (use `for...of` or `some`/`every`) |

```js
const result = [1, 2].forEach((n) => n * 2)   // undefined ❌
```

**Don't use `map` just to loop** without using the result. That's what `forEach` is for.

---

## Polyfills

A very common interview task: "**Implement `map`, `filter` and `reduce` yourself.**"

```js
Array.prototype.myMap = function (callback, thisArg) {
  const result = []
  for (let i = 0; i < this.length; i++) {
    if (i in this) {                                   // skip holes
      result[i] = callback.call(thisArg, this[i], i, this)
    }
  }
  return result
}

Array.prototype.myFilter = function (callback, thisArg) {
  const result = []
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      result.push(this[i])
    }
  }
  return result
}

Array.prototype.myReduce = function (callback, initialValue) {
  let i = 0
  let acc = initialValue

  if (arguments.length < 2) {                          // no initial value given
    while (i < this.length && !(i in this)) i++       // find the first real item
    if (i >= this.length) {
      throw new TypeError('Reduce of empty array with no initial value')
    }
    acc = this[i++]
  }

  for (; i < this.length; i++) {
    if (i in this) acc = callback(acc, this[i], i, this)
  }
  return acc
}

[1, 2, 3].myMap((n) => n * 2)               // [2, 4, 6]
[1, 2, 3, 4].myFilter((n) => n % 2 === 0)   // [2, 4]
[1, 2, 3].myReduce((a, b) => a + b, 0)      // 6
```

**Key points interviewers look for:**

- **A regular `function`, not an arrow**, so `this` is the array (see the `this` keyword question).
- **The callback receives `(item, index, array)`.**
- **It returns a new array** and doesn't mutate the original.
- **For `reduce`: no initial value** means start from the first item, and an **empty array throws**.

---

## Quick Q&A

**Q: Do map, filter and reduce change the original array?**
No. They return new values. But objects inside are shared, so don't mutate them.

**Q: Which one returns a single value?**
`reduce`.

**Q: When would you use `reduce` over `map` + `filter`?**
To build objects (grouping, counting, lookup maps), or to do it in one pass for performance.

**Q: Why always pass an initial value to `reduce`?**
Without it, an empty array throws a TypeError, and the first item's type decides the accumulator's type.

**Q: `find` vs `filter`?**
`find` returns the **first matching item** (or `undefined`) and stops early. `filter` returns **all matches** in an array.

---

## 🎯 Interview answer

> "`map`, `filter` and `reduce` are array methods that don't mutate the original array. `map` transforms every element and returns a new array of the same length; I use it to reshape data and to render lists in React with a key. `filter` returns a new array with only the elements whose callback returns true; I use it for search, and for removing items from state immutably. `reduce` combines all elements into a single value of any type by carrying an accumulator through each step; it's great for totals, counting occurrences, grouping, building lookup objects, or composing functions. I always pass an initial value to `reduce`, because an empty array without one throws a TypeError. Common gotchas: `['1','2','3'].map(parseInt)` returns `[1, NaN, NaN]` because map passes the index as parseInt's radix; forgetting to return in a braces arrow gives undefined; and mutating objects inside `map` changes the originals, which breaks React updates. `map` returns a new array while `forEach` returns undefined and is meant for side effects."
