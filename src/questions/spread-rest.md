## Short answer

Spread and rest use the **same syntax, `...`**, but do **opposite** jobs:

- **Spread:** a group gets **expanded** into separate items.
- **Rest:** separate items get **collected** into a group.

**How to tell which is which:**
- `...` on the **right of `=`**, or in a **function call**, is **spread**.
- `...` on the **left of `=`**, or in **function parameters**, is **rest**.

---

## Spread

```js
// Arrays
const a = [1, 2, 3]
const b = [...a, 4, 5]        // [1, 2, 3, 4, 5]
const copy = [...a]           // new array

// Objects
const user = { name: 'Sam', age: 25 }
const updated = { ...user, age: 26 }   // { name: 'Sam', age: 26 }

// Function calls
Math.max(...[5, 1, 9])        // 9

// Strings
[...'hi']                     // ['h', 'i']
```

**Order matters: later keys win.**

```js
{ ...user, age: 26 }   // age = 26 ✅
{ age: 26, ...user }   // age = 25 ❌ overwritten
```

---

## Rest

```js
// Function parameters
function sum(...numbers) {          // numbers = [1, 2, 3]
  return numbers.reduce((a, b) => a + b, 0)
}
sum(1, 2, 3)

// Array destructuring
const [first, ...others] = [10, 20, 30]   // first = 10, others = [20, 30]

// Object destructuring
const { name, ...info } = { name: 'Sam', age: 25, city: 'Kochi' }
// name = 'Sam', info = { age: 25, city: 'Kochi' }
```

**Rest must come last:** `const [...a, last] = arr` is a ❌ SyntaxError.

---

## In React

### 1. Immutable state updates (spread)

```jsx
setItems([...items, newItem])                                       // add
setItems(items.filter((i) => i.id !== id))                          // remove
setItems(items.map((i) => (i.id === id ? { ...i, done: true } : i)))  // update one
setUser({ ...user, age: 26 })                                       // update object

// ❌ Mutating: same reference, so React won't re-render
items.push(newItem); setItems(items)
```

### 2. Passing all props (spread)

```jsx
<Message {...props} />
```

### 3. Wrapper components (rest + spread)

```jsx
function MyButton({ variant, ...rest }) {      // REST: collect the other props
  return (
    <button
      className={variant === 'danger' ? 'bg-red-500' : 'bg-blue-500'}
      {...rest}                                 // SPREAD: forward onClick, disabled...
    />
  )
}
```

---

## ⚠️ Shallow copy

Spread copies **only one level**. Nested objects are **shared**:

```js
const user = { name: 'Sam', address: { city: 'Kochi' } }
const copy = { ...user }
copy.address.city = 'Delhi'
user.address.city   // 'Delhi' 😱
```

In React, spread every level you change:

```jsx
setUser({ ...user, address: { ...user.address, city: 'Delhi' } })
```

For a deep copy, use `structuredClone(obj)`.

---

## 🎯 Interview answer

> "Spread and rest both use three dots but do opposite things. Spread expands an array or object into individual elements: copying, merging, or passing array items as function arguments. Rest collects multiple elements into one array or object, in function parameters or destructuring, and must come last. In React, spread is essential for immutable state updates, like `[...items, newItem]` or `{ ...user, age: 26 }`, because React detects changes by reference. Rest plus spread is common in wrapper components to forward the remaining props. One gotcha is that spread is a shallow copy, so nested objects need to be spread at every level, or use `structuredClone`."
