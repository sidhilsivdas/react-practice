## Quick answer

**JavaScript has 8 data types:**

- **7 primitives:** `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`. They're **immutable** and **copied by value**.
- **1 non-primitive: `object`.** This includes arrays, functions, dates, Maps and Sets. Objects are mutable and handled **by reference**.

**The garbage collector (GC) frees memory automatically.** It keeps everything that is **reachable** from the "roots" (global variables, the current call stack, closures) and frees everything else.

- V8 (Chrome, Edge, Node) uses **mark-and-sweep** with **generations**: a fast "scavenger" for new, short-lived objects, and mark-sweep-compact for old ones.
- Most of the work runs **incrementally and concurrently**, so pauses are short.

---

## The 8 data types

| Type | Example | `typeof` | Notes |
|---|---|---|---|
| **string** | `'hi'`, `` `Hi ${name}` `` | `'string'` | Immutable text (UTF-16) |
| **number** | `42`, `3.14`, `NaN`, `Infinity` | `'number'` | 64-bit floating point. `0.1 + 0.2` → `0.30000000000000004`. Safe integers go up to `Number.MAX_SAFE_INTEGER` (9007199254740991). |
| **bigint** | `10n`, `BigInt(2) ** 64n` | `'bigint'` | Integers of any size. Can't be mixed with numbers: `1n + 1` → `TypeError: Cannot mix BigInt and other types, use explicit conversions` |
| **boolean** | `true`, `false` | `'boolean'` | |
| **undefined** | `let x;` | `'undefined'` | "No value assigned yet" (set by JavaScript) |
| **null** | `let user = null` | **`'object'`** ⚠️ | "Intentionally empty" (set by you). `typeof null` is a famous bug from the first version of JavaScript that can't be fixed. |
| **symbol** | `Symbol('id')` | `'symbol'` | Always unique: `Symbol('id') === Symbol('id')` → `false`. Used for hidden or unique object keys. |
| **object** | `{}`, `[]`, `new Date()`, `new Map()`, `function () {}` | `'object'` (functions: `'function'`) | Everything that isn't a primitive |

**`typeof` surprises (verified in V8):**

```js
typeof null          // 'object'   ← historical bug
typeof []            // 'object'   ← use Array.isArray([]) → true
typeof function(){}  // 'function' (functions are still objects)
typeof class {}      // 'function'
typeof NaN           // 'number'   ("Not a Number" is a number)
typeof notDeclared   // 'undefined' (no ReferenceError, unlike reading it)

// reliable type check for anything:
Object.prototype.toString.call(null)        // '[object Null]'
Object.prototype.toString.call([])          // '[object Array]'
Object.prototype.toString.call(new Date())  // '[object Date]'
```

**`null` vs `undefined`:** `null == undefined` → `true`, but `null === undefined` → `false`.

---

## Primitives vs objects

**Primitives are copied by value.** Each variable gets its own copy:

```js
let a = 10
let b = a      // copy the value
b = 20
console.log(a, b)   // 10 20
```

**Objects are shared by reference.** Both variables point to the **same object in memory**:

```js
const o1 = { n: 1 }
const o2 = o1          // copy the REFERENCE, not the object
o2.n = 2
console.log(o1.n)          // 2
console.log(o1 === o2)     // true  (same object)
console.log({ n: 1 } === { n: 1 })   // false (two different objects, even with the same content)
```

**Primitives are immutable.** Methods return a **new** value:

```js
const s = 'hello'
s.toUpperCase()   // 'HELLO' (a new string)
console.log(s)    // 'hello' (unchanged)
s[0] = 'J'        // ignored in sloppy mode; in strict mode / ES modules:
                  // TypeError: Cannot assign to read only property '0' of string 'hello'
```

**Function arguments: "pass by sharing".** JavaScript always passes a **copy of the value**, but for objects that value **is a reference**:

```js
function change(x, obj) {
  x = 99          // changes only the local copy
  obj.n = 99      // changes the SHARED object ← visible outside
  obj = { n: 0 }  // points the local variable at a new object; the outside is not affected
}
let num = 1, ob = { n: 1 }
change(num, ob)
console.log(num, ob.n)   // 1 99
```

**Autoboxing:** `'abc'.length` works because JavaScript briefly wraps the primitive in a `String` object to find the method, then throws the wrapper away.

**In React:** this is why you must **create a new object or array** to update state (`setUser({ ...user, name })`). React compares with `Object.is`, so mutating the same object keeps the same reference, and React thinks nothing changed. (See **Spread & Rest operators → Shallow copy**.)

---

## Stack vs heap

**The usual interview explanation:**
- **Stack:** fast, ordered memory for function calls (call frames) and **primitive** values. Freed automatically when a function returns.
- **Heap:** a large, unordered memory area for **objects**. A variable holds a **reference** (an address) to the object on the heap. The **GC** frees the heap.

```
 STACK (call frame)            HEAP
 ┌──────────────┐
 │ age  = 30    │
 │ name = ──────┼──────▶  "Asha"
 │ user = ──────┼──────▶  { name: ─▶"Asha", tags: ─▶ ["admin"] }
 │ copy = ──────┼──────┘   (same object: user === copy)
 └──────────────┘
```

**What V8 actually does (a strong interview bonus):** "primitives on the stack" is a simplification.
- **Small integers ("Smis")** are stored **directly inside the value** (a tagged pointer), so they need no heap allocation and no GC.
- **Strings, BigInts, decimals like `3.14`** (as "HeapNumbers") and **symbols** usually **live on the heap** and are garbage-collected like objects. They're still immutable, so sharing them is safe.
- **Variables captured by a closure** are moved into a heap "context" object, so they outlive the function call.
- The optimising compiler can keep values in CPU registers, or remove allocations entirely ("escape analysis").

---

## How the GC treats each type

| Value | Memory | When it's freed |
|---|---|---|
| Small integer (`42`) | Inside the value itself (Smi) | Nothing to free |
| `true`, `false`, `null`, `undefined` | Shared single values ("oddballs") created once per engine | Never (there is only one of each) |
| Decimal numbers (`3.14`), BigInts | Heap (`HeapNumber`/`BigInt`), unless optimised away | When unreachable |
| Strings | Heap. Literals in your code live as long as the code; repeated identical literals are often stored once (interned). | Dynamic strings: when unreachable |
| `Symbol('x')` | Heap | When unreachable |
| `Symbol.for('x')` | **Global symbol registry** | **Never**: anyone can get it back with `Symbol.for`, so it stays reachable |
| Objects, arrays, functions, Maps | Heap | When unreachable (even in cycles) |
| Closure variables | Heap context object | When no function that uses them is reachable |
| DOM nodes | Browser memory (C++), linked to JS wrapper objects | When neither the document tree nor any JS reference holds them |

---

## Garbage collection mechanism

**Step 1. Reachability.** Memory is kept if it can be reached from a **root**:
- **Global object** (`window` / `globalThis`) and module-level variables.
- **The call stack:** local variables and arguments of functions that are running.
- **Closures**, **active timers and event listeners**, **pending promises and callbacks**, **the DOM tree**.

Anything reachable from a root, directly or through a chain of references, is "alive". **Everything else is garbage.**

```js
let user = { name: 'Asha' }   // the object is reachable through `user`
let admin = user              // two references now
user = null                   // still reachable through `admin`, so NOT collected
admin = null                  // no references left → unreachable → will be collected
```

**Step 2. Mark-and-sweep.**

```
 Roots ─▶ A ─▶ B          D ⇄ E      (D and E point at each other, but nothing reaches them)
          └──▶ C

 MARK:  start at the roots and follow every reference: A, B, C are marked "alive"
 SWEEP: everything not marked (D, E) is freed
 COMPACT (sometimes): move the live objects together to remove gaps (less fragmentation)
```

**Why not reference counting?** An older idea counted references to each object and freed it at 0. **Cycles break it:** D and E reference each other, so their counts never reach 0, and they leak forever. Old Internet Explorer leaked like this with DOM ↔ JS cycles. **Mark-and-sweep handles cycles naturally.** Verified with `node --expose-gc`: after `a.other = b; b.other = a; a = b = null`, both are collected.

**Step 3. Generations (the "generational hypothesis": most objects die young).** V8 splits the heap:

| | **Young generation** ("nursery") | **Old generation** |
|---|---|---|
| Size | Small (a few MB to tens of MB) | Large (most of the heap) |
| Contains | Newly created objects | Objects that survived **two** young collections |
| Algorithm | **Scavenger** (minor GC): copies the *live* objects to an empty half ("semi-space"), and the rest is dropped in one go | **Mark-sweep-compact** (major GC) |
| Speed | Very fast and frequent; cost depends only on *live* objects | Slower and less frequent |

```
 new object ──▶ [ Nursery ] ──survives──▶ [ Intermediate ] ──survives──▶ [ Old generation ]
                     │                          │
                  dies young (most temporary objects: array.map results, JSX objects, event objects)
                  → freed almost for free
```

**Step 4. Avoiding long pauses ("Orinoco", V8's GC project):**
- **Parallel:** several helper threads do GC work at the same time.
- **Incremental:** marking is split into small steps between pieces of JavaScript.
- **Concurrent:** marking and sweeping run on background threads **while your JavaScript keeps running**. **Write barriers** track references you change during marking.
- **Idle-time GC:** Chrome schedules GC work in the idle gaps between animation frames.

**You can't control the GC:**
- There's no `gc()` in normal JavaScript. (DevTools' 🗑️ "Collect garbage" button and Node's `--expose-gc` flag exist only for debugging.)
- **`obj = null` or `delete obj.key` only removes a reference.** The memory is freed later, *if* nothing else references it.
- **You can't know exactly when** an object will be collected.

---

## Weak references

**Normal references keep objects alive. Weak references don't.**

| API | Use |
|---|---|
| **`WeakMap`** | Attach extra data to an object (cache, metadata) **without keeping it alive**. When the key object is collected, the entry disappears. |
| **`WeakSet`** | Mark objects ("already processed") without keeping them alive |
| **`WeakRef`** | Hold an object you can lose (`ref.deref()` returns `undefined` after it's collected). Used for large caches. |
| **`FinalizationRegistry`** | Get a callback **some time after** an object is collected (cleanup of external resources). Not guaranteed to run. |

```js
const metadata = new WeakMap()

function track(element) {
  metadata.set(element, { clicks: 0 })   // doesn't keep `element` alive
}
// when the element is removed from the page and no other code references it,
// both the element and its { clicks } entry can be collected

new WeakMap().set('key', 1)   // TypeError: Invalid value used as weak map key
// keys must be objects, or non-registered symbols (Symbol('x'), not Symbol.for('x'))
```

**WeakMap vs Map:** a `Map` holding DOM elements as keys keeps every removed element in memory, which is a classic leak. A `WeakMap` doesn't. The trade-off: WeakMaps can't be iterated and have no `.size`, because entries may disappear at any time.

---

## Memory leaks: when GC can't help

**A leak = memory you don't need anymore that is still reachable**, so the GC is not allowed to free it.

| Leak | Why it stays reachable | Fix |
|---|---|---|
| **Accidental globals** | `function f() { leaked = [] }` without `let` (in sloppy mode) attaches it to `window` | Strict mode / ES modules (throws `ReferenceError`) |
| **Forgotten timers** | `setInterval` callback → closure → big data | `clearInterval` (in React: `useEffect` cleanup) |
| **Event listeners** | `window`/`document` listener → handler → component data | `removeEventListener` / `AbortController` in cleanup |
| **Detached DOM nodes** | Removed from the page but still referenced by a JS variable, array or Map | Drop the reference; use `WeakMap` for per-element data |
| **Closures holding big data** | A small callback closes over a big variable in the same scope | Keep only what you need; null out big values |
| **Unbounded caches** | A module-level `Map` that only grows | LRU limits, `WeakMap`, TTLs |
| **Subscriptions** | WebSocket / store / observer subscriptions never unsubscribed | Unsubscribe in cleanup |

```jsx
useEffect(() => {
  const controller = new AbortController()
  window.addEventListener('resize', onResize, { signal: controller.signal })
  const id = setInterval(poll, 5000)
  return () => {                 // cleanup runs on unmount → references removed → GC can free them
    controller.abort()
    clearInterval(id)
  }
}, [])
```

**Finding leaks:** Chrome DevTools → **Memory** → take a heap snapshot, repeat the action (open and close a modal 10 times), take another, and compare. Search for **"Detached"** to find detached DOM nodes. The **Retainers** panel shows *who* keeps an object alive. (Full workflow: **Frontend Architecture → Finding & fixing memory leaks in a long-running SPA**.)

---

## Interview Q&A

**Q: How many data types does JavaScript have?**
Eight: seven primitives (string, number, bigint, boolean, undefined, null, symbol) and object. Arrays and functions are objects.

**Q: Why is `typeof null === 'object'`?**
A bug from the first JavaScript implementation (null was stored with the object type tag). It was kept for backwards compatibility.

**Q: Is JavaScript pass-by-value or pass-by-reference?**
Always pass-by-value, but for objects the value is a reference ("pass by sharing"). Mutating the object is visible outside; reassigning the parameter isn't.

**Q: When is an object garbage-collected?**
When it's no longer reachable from any root (globals, the call stack, closures, active listeners and timers). Not when its reference count reaches zero, and not at a predictable time.

**Q: Does mark-and-sweep handle circular references?**
Yes. Objects that only reference each other but aren't reachable from a root are collected. Reference counting is the algorithm that fails on cycles.

**Q: What is generational garbage collection?**
New objects go into a small young generation that is collected often and cheaply (the scavenger copies only survivors). Objects that survive are promoted to the old generation, which is collected less often with mark-sweep-compact.

**Q: Does setting a variable to `null` free memory?**
It removes one reference. The memory is freed at the GC's next suitable cycle, if no other reference exists.

**Q: What's the difference between `Map` and `WeakMap` for memory?**
A `Map` keeps its keys alive; a `WeakMap` holds its keys weakly, so entries vanish when the key object is collected. That makes WeakMap ideal for per-object metadata and caches.

---

## 🎯 Interview answer

> "JavaScript has eight data types: seven primitives, which are string, number, bigint, boolean, undefined, null and symbol, plus object, which covers arrays, functions, dates, Maps and so on. Primitives are immutable and copied by value; objects are shared by reference, which is why mutating a shared object is visible everywhere, and why in React we create new objects to update state. Functions receive copies of values, and for objects that value is a reference. The common model is that primitives live on the stack and objects on the heap; in V8, small integers are stored directly in the value, while strings, decimals and BigInts are heap values that are garbage-collected too. The garbage collector frees memory that is no longer reachable from roots like globals, the call stack, closures, and active timers and listeners. V8 uses mark-and-sweep, which handles circular references, unlike reference counting, with generations: a young generation collected often by a fast copying scavenger, since most objects die young, and an old generation collected with mark-sweep-compact. Most of that work is incremental, parallel and concurrent to keep pauses short. Setting a variable to null only removes a reference, and we can't control when collection happens. Leaks happen when unneeded memory is still reachable, through forgotten timers, listeners, subscriptions, detached DOM nodes or growing caches, so I clean up in `useEffect`, use WeakMap for per-object data, and find leaks with heap snapshot comparisons in DevTools."
