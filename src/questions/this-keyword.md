## Short answer

**`this` is decided by HOW a function is called, not where it is written.**

**The one exception is arrow functions.** They have **no `this` of their own** and use the `this` from **where they're written**.

**Analogy:** `this` is like the word **"me"**. Its meaning depends on **who is speaking**. If Sam says "me", it means Sam. If Priya says "me", it means Priya. The word is the same, but the speaker (the caller) is different.

> **Note:** Vite and React projects use **ES modules**, which always run in **strict mode**. That changes some answers below, so both cases are shown: **strict** (modules) and **sloppy** (an old `<script>` tag).

---

## Global & plain call

```js
console.log(this)

function show() {
  console.log(this)
}
show()
```

| Where | Sloppy (old `<script>`) | Strict / modules |
|---|---|---|
| Global scope | `window` | `undefined` |
| Plain call `show()` | `window` | `undefined` |

**Rule:** if nothing is before the dot, there's **no owner**, so you get `window` or `undefined`.

---

## Object method

```js
const user = {
  name: 'Sam',
  greet() {
    console.log(this.name)
  },
}

user.greet()   // "Sam"
```

**Rule: look at what's left of the dot when the function is called.** In `user.greet()`, that's `user`, so `this` is `user`.

### Nested objects: only the last owner counts

```js
const company = {
  name: 'Acme',
  team: {
    name: 'Frontend',
    show() { console.log(this.name) },
  },
}

company.team.show()   // "Frontend"  (left of the last dot = team)
```

---

## Losing this

```js
const user = {
  name: 'Sam',
  greet() { console.log(this.name) },
}

const fn = user.greet     // copied the function, not the owner
fn()                      // ❌ strict: TypeError (this is undefined)
                          //    sloppy: "" (window.name)

setTimeout(user.greet, 1000)                   // ❌ this = window → prints ""
button.addEventListener('click', user.greet)   // ❌ this = button
```

**Why:** `this` is decided **at call time**. `fn()` has nothing before the dot, so the link to `user` is lost.

**Fixes:**

```js
setTimeout(() => user.greet(), 1000)    // ✅ called as user.greet()
setTimeout(user.greet.bind(user), 1000) // ✅ permanently bound
```

---

## Function inside a method

```js
const user = {
  name: 'Sam',
  greet() {
    function inner() {
      console.log(this.name)
    }
    inner()                // plain call → no owner!
  },
}

user.greet()   // ❌ strict: TypeError | sloppy: "" (window)
```

`inner()` is a **plain call**, so it doesn't inherit `this` from `greet`.

**Fix: use an arrow function**, which borrows `this` from `greet`:

```js
greet() {
  const inner = () => console.log(this.name)
  inner()      // ✅ "Sam"
}
```

(The old-school fix was `const self = this` and then using `self` inside.)

---

## Arrow functions

**Arrow functions have no `this`. They use the `this` of the code around them**, at the place where they're **written**.

### ✅ Good: an arrow inside a method

```js
const timer = {
  seconds: 0,
  start() {
    setInterval(() => {
      this.seconds++         // this = timer (borrowed from start)
    }, 1000)
  },
}
timer.start()
```

### ❌ Bad: an arrow as an object method

```js
const user = {
  name: 'Sam',
  greet: () => {
    console.log(this.name)
  },
}

user.greet()   // ❌ undefined / TypeError
```

**Why:** an object literal `{ }` **is not a scope**. The arrow looks outside the object, to global `this` (`window` or `undefined`), **not** `user`.

**Rule:** use regular functions for object methods, and arrow functions **inside** methods.

### Arrows can't be re-bound

```js
const arrow = () => console.log(this)
arrow.call({ a: 1 })   // still the outer this, call is ignored
```

---

## call, apply, bind

```js
function intro(city, country) {
  console.log(`${this.name} from ${city}, ${country}`)
}
const person = { name: 'Sam' }

intro.call(person, 'Kochi', 'India')      // runs now, args one by one
intro.apply(person, ['Kochi', 'India'])   // runs now, args as an array
const bound = intro.bind(person)          // returns a NEW function, runs later
bound('Kochi', 'India')
```

| | Runs immediately? | Arguments |
|---|---|---|
| `call` | ✅ | one by one: `a, b` |
| `apply` | ✅ | array: `[a, b]` |
| `bind` | ❌ returns a new function | one by one (can be preset) |

**Memory trick:** **C**all uses **C**ommas, **A**pply uses an **A**rray.

### `bind` only works once

```js
function show() { console.log(this.name) }
const a = show.bind({ name: 'A' })
const b = a.bind({ name: 'B' })
b()   // "A": a bound function can't be re-bound
```

---

## new & classes

```js
function Person(name) {
  this.name = name      // this = the brand new object
}
const p = new Person('Sam')
console.log(p.name)     // "Sam"
```

**What `new` does:** it creates an empty object `{}`, sets `this` to it, runs the function, and returns the object.

### Classes

```js
class Counter {
  count = 0

  increment() {
    this.count++
  }
}

const c = new Counter()
c.increment()               // ✅ this = c

const fn = c.increment
fn()                        // ❌ TypeError: classes are always strict, so this = undefined
```

**Fix 1: an arrow function as a class field:**

```js
class Counter {
  count = 0
  increment = () => {       // this is locked to the instance
    this.count++
  }
}
```

**Fix 2: bind in the constructor:**

```js
constructor() {
  this.increment = this.increment.bind(this)
}
```

---

## DOM events & callbacks

```js
const button = document.querySelector('button')

button.addEventListener('click', function () {
  console.log(this)        // the <button> element
})

button.addEventListener('click', () => {
  console.log(this)        // outer this (window / undefined), NOT the button
})
```

```html
<button onclick="console.log(this)">Click</button>   <!-- the <button> element -->
```

**Tip:** with arrows, use `event.currentTarget` to get the element.

### setTimeout and forEach

```js
setTimeout(function () {
  console.log(this)        // window (the browser calls it that way)
}, 0)

[1, 2].forEach(function () {
  console.log(this)        // undefined (strict) / window (sloppy)
})

[1, 2].forEach(function () {
  console.log(this.x)      // 5: forEach accepts a "thisArg"
}, { x: 5 })
```

---

## In React

### Class components: why you needed `bind`

```jsx
class Counter extends React.Component {
  state = { count: 0 }

  handleClick() {
    this.setState({ count: this.state.count + 1 })   // ❌ this = undefined
  }

  render() {
    return <button onClick={this.handleClick}>+</button>
    //                     ↑ passed as a plain function, so `this` is lost
  }
}
```

**React calls `handleClick()` later as a plain function**, so `this` is lost.

**Fixes:**

```jsx
// ✅ 1. Arrow class field (most common)
handleClick = () => {
  this.setState({ count: this.state.count + 1 })
}

// ✅ 2. Bind in the constructor
constructor(props) {
  super(props)
  this.handleClick = this.handleClick.bind(this)
}

// ⚠️ 3. Arrow in render: works, but creates a new function every render
<button onClick={() => this.handleClick()}>+</button>
```

### Function components: no `this` at all 🎉

```jsx
function Counter() {
  const [count, setCount] = useState(0)
  const handleClick = () => setCount(count + 1)   // no this needed
  return <button onClick={handleClick}>+</button>
}
```

This is one of the big reasons **hooks and function components replaced classes**: no more `this` confusion.

---

## Priority rules

From highest to lowest:

```
1. new                         → the new object
2. call / apply / bind         → the object you pass
3. method call  obj.fn()       → obj
4. plain call   fn()           → undefined (strict) / window (sloppy)

Arrow functions → ignore all of these, use the surrounding this
```

---

## Quiz

```js
const obj = {
  name: 'Obj',
  regular() { return this.name },
  arrow: () => this?.name,
  nested() {
    function inner() { return this }
    return inner()
  },
  nestedArrow() {
    const inner = () => this.name
    return inner()
  },
}
```

| Call | Result (module / strict) | Why |
|---|---|---|
| `obj.regular()` | `"Obj"` | left of the dot is `obj` |
| `obj.arrow()` | `undefined` | arrow uses the outer (global) `this` |
| `obj.nested()` | `undefined` | `inner()` is a plain call |
| `obj.nestedArrow()` | `"Obj"` | the arrow borrows `this` from `nestedArrow` |
| `const f = obj.regular; f()` | ❌ TypeError | lost `this` |
| `obj.regular.call({ name: 'X' })` | `"X"` | explicit `this` |
| `setTimeout(obj.regular)` | `""` (`window.name`) | the browser calls it with `window` |

---

## 🎯 Interview answer

> "`this` refers to the object that is executing the current function, and for regular functions it's decided at call time, by how the function is called, not where it's defined. When called as a method, like `obj.fn()`, `this` is the object left of the dot. A plain call `fn()` gives `undefined` in strict mode, or `window` in sloppy mode. With `new`, `this` is the newly created object. `call`, `apply` and `bind` set it explicitly: call and apply invoke immediately, with comma-separated arguments versus an array, and bind returns a new permanently-bound function. Arrow functions don't have their own `this`; they take it lexically from the surrounding scope, which makes them great for callbacks inside methods but wrong as object methods. The classic bug is losing `this` when passing a method as a callback, like `setTimeout(obj.fn)` or `onClick={this.handleClick}` in React class components, fixed with `bind` or arrow class fields. Function components with hooks avoid `this` entirely."
