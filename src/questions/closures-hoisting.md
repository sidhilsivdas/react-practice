## Short answer

- **Hoisting:** before running code, JavaScript **registers all declarations in their scope first**. So a variable or function "exists" from the top of its scope. But **what it contains** before its line runs depends on how it was declared.
- **Temporal Dead Zone (TDZ):** the time between the start of the scope and the line where a `let` / `const` / `class` is declared. Touching it then throws **`ReferenceError: Cannot access 'x' before initialization`**.
- **Closure:** a function **remembers the variables from where it was created**, even after that outer function has finished.

| Declared with | Hoisted? | Value before its line | Scope |
|---|---|---|---|
| `var` | ✅ | **`undefined`** | function |
| `let` / `const` | ✅ (registered) | ❌ **TDZ → ReferenceError** | block `{ }` |
| `function foo() {}` (declaration) | ✅ **with its body** | ✅ **works fully** | function (block in strict mode) |
| `var foo = function () {}` | ✅ (as `var`) | `undefined` → calling it: **TypeError** | function |
| `const foo = () => {}` / `let foo = function () {}` | ✅ (registered) | ❌ **TDZ → ReferenceError** | block |
| `class Foo {}` | ✅ (registered) | ❌ **TDZ → ReferenceError** | block |

**Analogy: a classroom register** 📋 Before class starts, the teacher reads the whole register (hoisting), so every name is known. A `var` student answers "present, but empty-handed" (`undefined`). A `let`/`const` student is known to be coming, but **you may not talk to them until they actually walk in** (the TDZ). A function declaration arrives **before the bell, ready to work**.

**All results and error messages below come from actually running the code in Node.js** (V8, the same engine as Chrome). Firefox and Safari word some errors differently.

---

## How hoisting works

**JavaScript runs code in two phases:**

1. **Creation phase:** scan the scope and **register all declarations**:
   - **`var`** → created and set to **`undefined`**.
   - **`function` declarations** → created **with their full body**.
   - **`let` / `const` / `class`** → registered but **uninitialised** (TDZ).
2. **Execution phase:** run the code line by line, assigning values.

```js
console.log(a)   // undefined  ← var exists, but has no value yet
var a = 5
console.log(a)   // 5
```

**JavaScript sees it like this:**

```js
var a            // hoisted to the top, = undefined
console.log(a)   // undefined
a = 5            // the assignment stays where it was written
console.log(a)   // 5
```

**Only the declaration is hoisted, never the assignment.**

---

## var vs let vs const

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | **function** | **block** `{ }` | **block** `{ }` |
| Before its line | `undefined` | TDZ (ReferenceError) | TDZ (ReferenceError) |
| Redeclare in the same scope | ✅ allowed (silently) | ❌ SyntaxError | ❌ SyntaxError |
| Reassign | ✅ | ✅ | ❌ TypeError |
| Must initialise | ❌ | ❌ | ✅ |
| Becomes `window.x` at the top level (browser scripts) | ✅ | ❌ | ❌ |

### Block scope

```js
if (true) {
  var leaked = 'yes'
  let inside = 'yes'
}
console.log(leaked)   // 'yes'  ← var ignores blocks (only functions limit it)
console.log(inside)   // ❌ ReferenceError: inside is not defined
```

### const means "no reassignment", not "frozen"

```js
const x = 1
x = 2                         // ❌ TypeError: Assignment to constant variable.

const user = { name: 'Sam' }
user.name = 'Priya'           // ✅ allowed: the object's contents can change
console.log(user.name)        // 'Priya'

const frozen = Object.freeze({ name: 'Sam' })   // to really prevent changes (shallow)
```

### Other errors

```js
const y                       // ❌ SyntaxError: Missing initializer in const declaration

let z = 1
let z = 2                     // ❌ SyntaxError: Identifier 'z' has already been declared

var w = 1
var w = 2                     // ✅ no error (one reason var causes bugs)
```

---

## Temporal Dead Zone

```js
console.log(b)    // ❌ ReferenceError: Cannot access 'b' before initialization
let b = 5
```

```
{                                   ← scope starts: b is registered, but uninitialised
  ┌───────── TDZ for b ─────────┐
  │ console.log(b)  → ❌ error   │
  └─────────────────────────────┘
  let b = 5                         ← TDZ ends: b is initialised
  console.log(b)  → 5 ✅
}
```

### Why the TDZ exists

**To catch bugs.** With `var`, reading a variable too early silently gives `undefined`, and the bug shows up much later. With `let`/`const`, you get an **immediate, clear error**.

### TDZ is about time, not position ⭐

```js
function show() {
  return value                // written ABOVE the declaration
}

let value = 42
console.log(show())           // ✅ 42: called AFTER the declaration ran
```

```js
function show() {
  return value
}

console.log(show())           // ❌ ReferenceError: Cannot access 'value' before initialization
let value = 42                // called while value was still in the TDZ
```

**What matters is when the code runs, not where it's written.**

### TDZ surprises

```js
// shadowing: the inner `let x` puts x in the TDZ for the WHOLE function
let x = 1
function f() {
  console.log(x)              // ❌ ReferenceError: Cannot access 'x' before initialization
  let x = 2                   //    (it does NOT fall back to the outer x)
}

// typeof is no longer "safe"
console.log(typeof notDeclaredAnywhere)  // 'undefined' ✅
console.log(typeof d)                    // ❌ ReferenceError: Cannot access 'd' before initialization
let d = 1

// default parameters are evaluated left to right
function g(a = b, b = 1) {}
g()                           // ❌ ReferenceError: Cannot access 'b' before initialization
```

---

## Functions: declaration vs expression vs arrow

```js
// 1. Function DECLARATION: hoisted with its body, so it can be called before its line
console.log(greet())          // ✅ 'hi'
function greet() { return 'hi' }

// 2. Function EXPRESSION assigned to var: only the variable is hoisted (as undefined)
console.log(typeof sayHi)     // 'undefined'
sayHi()                       // ❌ TypeError: sayHi is not a function
var sayHi = function () { return 'hi' }

// 3. Arrow function / function expression assigned to const or let: TDZ
add(1, 2)                     // ❌ ReferenceError: Cannot access 'add' before initialization
const add = (a, b) => a + b

mul(2, 3)                     // ❌ ReferenceError: Cannot access 'mul' before initialization
let mul = function (a, b) { return a * b }

// 4. Classes: TDZ too
new Person()                  // ❌ ReferenceError: Cannot access 'Person' before initialization
class Person {}
```

### Reading the error messages ⭐

| Error | Meaning |
|---|---|
| **`ReferenceError: x is not defined`** | `x` was **never declared** in any reachable scope (a typo, or a missing import) |
| **`ReferenceError: Cannot access 'x' before initialization`** | `x` **is** declared with `let`/`const`/`class`, but used **in its TDZ** |
| **`TypeError: x is not a function`** | `x` exists, but its value isn't a function (often a `var` function expression called too early, so it's `undefined`) |
| **`TypeError: Assignment to constant variable.`** | Reassigning a `const` |
| **`SyntaxError: Missing initializer in const declaration`** | `const x;` with no value |
| **`SyntaxError: Identifier 'x' has already been declared`** | Declaring `let`/`const` twice in the same scope |

### Function and var with the same name

```js
console.log(typeof foo)       // 'function' ← function declarations win during hoisting
var foo = 1
function foo() {}
console.log(typeof foo)       // 'number'   ← then the assignment runs
```

### Named function expressions

```js
const fn = function inner() {
  return typeof inner         // 'function': the name exists INSIDE the function only
}
fn()                          // 'function'
typeof inner                  // 'undefined' outside
```

**Useful for recursion and clearer stack traces.**

### Which style to use?

| Style | Pros | Use for |
|---|---|---|
| `function name() {}` | Hoisted; has its own `this`; clear name in stack traces | Top-level helpers, React components, functions used before their definition |
| `const name = () => {}` | No hoisting surprises (TDZ); no own `this`; short | Callbacks, small helpers, functions inside components |
| `const name = function () {}` | Like the above, but with its own `this` | Object methods needing `this` (rarely) |

---

## Classic hoisting puzzles

```js
// Puzzle 1
var x = 1
function f() {
  console.log(x)              // undefined (NOT 1): the inner `var x` is hoisted inside f
  var x = 2
}
f()

// Puzzle 2: same with let → error instead of undefined
let y = 1
function g() {
  console.log(y)              // ❌ ReferenceError: Cannot access 'y' before initialization
  let y = 2
}
g()
```

**Lesson:** a declaration anywhere in a function **shadows** the outer variable for the **whole** function.

---

## Closures

**A closure is a function plus the variables it remembers from where it was created.**

```js
function createCounter() {
  let count = 0                          // private: nothing outside can touch it

  return {
    increment: () => ++count,            // these functions "close over" count
    get: () => count,
  }
}

const c1 = createCounter()
const c2 = createCounter()               // a NEW, separate count

c1.increment()
c1.increment()
c2.increment()

c1.get()    // 2
c2.get()    // 1
c1.count    // undefined: truly private
```

**How it works:**

- **Each call to `createCounter` creates a new scope** with its own `count`.
- **The returned functions keep a reference to that scope**, so it isn't garbage-collected.
- **`count` lives on after `createCounter` has returned.**

**Analogy: a backpack** 🎒 When a function is created, it packs a backpack with the variables around it, and carries it wherever it goes.

### Closures capture variables, not values

```js
let name = 'Sam'
const greet = () => 'Hi ' + name
name = 'Priya'
greet()           // 'Hi Priya': it reads the CURRENT value of the variable
```

---

## Closure uses

```js
// 1. Function factories
const multiplier = (factor) => (x) => x * factor
const double = multiplier(2)
const triple = multiplier(3)
double(5)   // 10
triple(5)   // 15

// 2. Run only once (e.g. initialise analytics)
function once(fn) {
  let called = false
  let result
  return (...args) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}

// 3. Private state / module pattern
const bank = (() => {
  let balance = 0
  return {
    deposit: (amount) => (balance += amount),
    getBalance: () => balance,
  }
})()

// 4. Debounce, throttle and memoize all rely on closures (see the Coding tab)
// 5. Event handlers and callbacks that remember data
buttons.forEach((button, index) => {
  button.addEventListener('click', () => console.log(`button ${index} clicked`))
})
```

---

## The loop puzzle ⭐

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0)
// 3 3 3

for (let j = 0; j < 3; j++) setTimeout(() => console.log(j), 0)
// 0 1 2
```

**Why:**

- **`var`:** there's **one** `i` for the whole loop. The callbacks run **after** the loop, when `i` is 3. All three closures share the same variable.
- **`let`:** each iteration gets a **new** `j`, so each closure remembers its own.

**The old fix (before `let`): an IIFE**, which gives each callback its own copy:

```js
for (var k = 0; k < 3; k++) {
  ((copy) => setTimeout(() => console.log(copy), 0))(k)
}
// 0 1 2
```

---

## Closures in React

**Every render creates new closures over that render's props and state.** That's why you get **stale closures**:

```jsx
function Timer() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1)          // ❌ this closure captured count = 0 forever → stuck at 1
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // ✅ fixes: functional update setCount((c) => c + 1),
  //    or add count to the dependencies, or keep the latest value in a ref
}
```

- **Event handlers see the state from the render they were created in.**
- **`useCallback` and `useMemo` dependencies decide when a closure is recreated.**
- **Custom hooks** like `useDebounce` keep timers in refs because of closures.

---

## Closures & memory

**A closure keeps its variables alive as long as the function is reachable.** That's usually fine, but it can cause leaks:

```js
function attach() {
  const hugeData = new Array(1e6).fill('x')
  window.addEventListener('resize', () => console.log(hugeData.length))   // hugeData lives forever
}
```

✅ **Fix:** remove listeners, clear timers, and don't capture big objects you don't need.

---

## Quick Q&A

**Q: What is hoisting?**
Declarations are registered at the start of their scope before code runs. `var` starts as `undefined`, function declarations are fully available, and `let`/`const`/`class` are registered but uninitialised (TDZ).

**Q: Are `let` and `const` hoisted?**
Yes. They're registered, which is why an inner `let x` shadows an outer `x` for the whole block, but they aren't initialised, so using them before their line throws.

**Q: What is the Temporal Dead Zone?**
The time from the start of a scope until a `let`/`const`/`class` declaration runs; accessing the variable then throws "Cannot access 'x' before initialization".

**Q: "x is not defined" vs "Cannot access 'x' before initialization"?**
The first means `x` was never declared. The second means it's declared with `let`/`const`/`class` but used inside its TDZ.

**Q: Can you call an arrow function before it's defined?**
No. It's a value assigned to a `const` or `let`, so it's in the TDZ (ReferenceError). A function declaration can be called early.

**Q: What is a closure?**
A function that keeps access to variables from the scope where it was created, even after that scope has finished running.

**Q: Why does the `var` loop print 3 3 3?**
`var` is function-scoped, so all callbacks share one `i`, which is 3 when they run. `let` creates a new binding per iteration.

**Q: Practical uses of closures?**
Private state, function factories, once, memoize, debounce and throttle, event handlers, module patterns, and React hooks.

---

## 🎯 Interview answer

> "Hoisting means that before code runs, JavaScript registers every declaration in its scope. `var` variables are created and set to `undefined`, so reading them early gives undefined instead of an error. Function declarations are hoisted with their whole body, so they can be called before their line. `let`, `const` and `class` are also registered, but stay uninitialised until their declaration runs; that period is the Temporal Dead Zone, and accessing them in it throws 'ReferenceError: Cannot access x before initialization', which is different from 'x is not defined', meaning it was never declared. The TDZ is about time, not position: a function that references a `let` defined later works if it's called after that line runs. Function expressions and arrow functions follow their variable: with `var`, calling early gives 'TypeError: not a function'; with `const` or `let`, a ReferenceError. `let` and `const` are also block-scoped and can't be redeclared, and `const` prevents reassignment but not mutation. A closure is a function that remembers the variables of the scope where it was created, even after that scope has returned. That enables private state, factories, once, memoize and debounce, and explains the classic loop puzzle (`var` shares one variable, so it prints 3 3 3; `let` creates one per iteration) and stale closures in React, which I fix with functional updates, correct dependencies or refs."
