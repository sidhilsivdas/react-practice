## Short answer

JavaScript is **single-threaded**: it can only do **one thing at a time**. The **event loop** is how it still handles timers, clicks and network calls without freezing.

**Analogy:** a restaurant with **one chef** (the JavaScript thread).

- **The chef cooks one order at a time.** That's the **call stack**.
- **Slow jobs, like waiting for the oven, go to helpers.** These are the **Web APIs**: timers, `fetch`, and DOM events.
- **When a helper finishes, the job waits in a line.** These are the **queues**.
- **The manager (the event loop)** waits until the chef is free, then hands over the next job.
- **VIP orders (microtasks) always skip the regular line (macrotasks).**

---

## The pieces

| Piece | What it does |
|---|---|
| **Call stack** | Runs your code, one function at a time |
| **Web APIs** | Browser features that do the waiting: `setTimeout`, `fetch`, DOM events |
| **Macrotask queue** (task queue) | Callbacks from timers, events, I/O |
| **Microtask queue** | Promise callbacks, `await` continuations |
| **Render steps** | `requestAnimationFrame` → style → layout → paint |
| **Event loop** | Moves work from the queues to the stack when the stack is empty |

```
         ┌──────────────┐        ┌───────────────────────┐
code ──▶ │  Call Stack  │ ─────▶ │ Web APIs              │
         └──────▲───────┘        │ (timers, fetch, DOM)  │
                │                └──────────┬────────────┘
                │                           │ done
                │      ┌────────────────────▼──────────┐
                │      │ Microtask queue  ⭐ (VIP)      │
                │      │ Macrotask queue  (regular)     │
                │      └────────────────┬──────────────┘
                └──── Event Loop ◀──────┘
```

---

## Macro vs micro tasks

| 🐢 **Macrotasks** (tasks) | ⚡ **Microtasks** |
|---|---|
| `setTimeout`, `setInterval` | `Promise.then` / `.catch` / `.finally` |
| DOM events (click, keypress) | Code after `await` |
| Initial `<script>` run | `queueMicrotask()` |
| `MessageChannel`, I/O callbacks | `MutationObserver` |
| **One per loop turn** | **All of them, until the queue is empty** |

---

## Loop steps

```js
while (true) {
  // 1. Run ONE macrotask (the first one is your whole script)
  runOldest(macrotaskQueue)

  // 2. Run ALL microtasks, including new ones added while running
  while (microtaskQueue.length) runOldest(microtaskQueue)

  // 3. Maybe render (~every 16ms at 60fps)
  if (timeToRender) {
    runAll(requestAnimationFrameCallbacks)
    recalculateStyles(); layout(); paint()
  }
}
```

**The three rules to remember:**

1. **Synchronous code always runs first.** Everything else waits for an empty call stack.
2. **After each macrotask, all microtasks run** before anything else.
3. **The page can't repaint while JavaScript is running.** Long code freezes the UI.

---

## Classic: 1 4 3 2

```js
console.log('1')

setTimeout(() => console.log('2'), 0)

Promise.resolve().then(() => console.log('3'))

console.log('4')
```

**Output: `1 4 3 2`**

| Step | What happens | Microtasks | Macrotasks | Output |
|---|---|---|---|---|
| 1 | log `1` (sync) | | | `1` |
| 2 | `setTimeout` → macro queue | | `log 2` | |
| 3 | `.then` → micro queue | `log 3` | `log 2` | |
| 4 | log `4` (sync) | `log 3` | `log 2` | `4` |
| 5 | script done → drain microtasks | | `log 2` | `3` |
| 6 | next macrotask | | | `2` |

**Key point:** `setTimeout(fn, 0)` doesn't mean "run now". It means "run in a **later macrotask**, at least 0 ms from now".

### The Promise constructor is synchronous

```js
console.log('A')

new Promise((resolve) => {
  console.log('B')        // runs immediately!
  resolve()
}).then(() => console.log('C'))

console.log('D')
```

**Output: `A B D C`**. Only `.then` is async.

---

## async / await order

```js
async function first() {
  console.log('first start')
  await second()
  console.log('first end')     // ← everything after await = microtask
}

async function second() {
  console.log('second')
}

console.log('script start')
setTimeout(() => console.log('timeout'), 0)
first()
Promise.resolve().then(() => console.log('promise'))
console.log('script end')
```

**Output:**

```
script start
first start
second
script end
first end
promise
timeout
```

**Why:**

1. **`first()` runs synchronously until `await`.** It prints `first start`, then calls `second()`, which prints `second`.
2. **`await` pauses `first`.** The rest of it ("first end") goes into the **microtask queue**.
3. **`.then` for "promise" is queued after it.**
4. **Synchronous code finishes** with `script end`.
5. **Microtasks run in order:** `first end`, then `promise`.
6. **The macrotask runs last:** `timeout`.

**Rule:** an `async` function is synchronous **until the first `await`**. Everything after it behaves like `.then`.

---

## Micro inside macro

```js
setTimeout(() => {
  console.log('T1')
  Promise.resolve().then(() => console.log('P inside T1'))
}, 0)

setTimeout(() => console.log('T2'), 0)

Promise.resolve().then(() => {
  console.log('P1')
  setTimeout(() => console.log('T3'), 0)
})
```

**Output: `P1  T1  P inside T1  T2  T3`**

```
Script done      → micro: [P1]           macro: [T1, T2]
Run P1           → schedules T3          macro: [T1, T2, T3]
Macrotask T1     → queues "P inside T1"
  drain micro    → "P inside T1"   ← runs BEFORE T2!
Macrotask T2
Macrotask T3
```

**Key point:** microtasks run **between every macrotask**, not just at the end.

### Promise chains take turns

```js
Promise.resolve()
  .then(() => console.log('A'))
  .then(() => console.log('B'))

Promise.resolve()
  .then(() => console.log('C'))
  .then(() => console.log('D'))
```

**Output: `A C B D`**. Each `.then` is queued only after the previous one finishes.

---

## var vs let in loops

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// Output: 3 3 3

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0)
}
// Output: 0 1 2
```

**Why:**

- **The callbacks run after the loop has finished.** That's the event loop at work.
- **`var` has one shared `i`**, which is `3` by then.
- **`let` creates a new `j` for each iteration**, so each callback keeps its own value.

---

## Blocking the main thread

```js
setTimeout(() => console.log('timer'), 0)

const start = Date.now()
while (Date.now() - start < 3000) {}   // busy for 3 seconds

console.log('done')
```

**Output:** `done` (after 3s), then `timer`.

- **The timer was ready after ~0 ms**, but the stack was busy.
- **During those 3 seconds**, clicks don't respond and the page can't repaint, so it's **frozen**.
- **Split heavy work up**, or move it to a **Web Worker**.

---

## Microtask starvation

```js
// ❌ Freezes the page forever
function loop() {
  Promise.resolve().then(loop)
}
loop()

// ✅ Page stays responsive
function loop2() {
  setTimeout(loop2, 0)
}
loop2()
```

- **The microtask queue must be empty before rendering**, so endlessly adding microtasks means the browser **never paints or handles clicks**.
- **Macrotasks give the browser a break** between each one.

---

## Real click vs click()

```js
button.addEventListener('click', () => {
  console.log('L1')
  Promise.resolve().then(() => console.log('M1'))
})
button.addEventListener('click', () => {
  console.log('L2')
  Promise.resolve().then(() => console.log('M2'))
})
```

| How clicked | Output | Why |
|---|---|---|
| **User clicks** | `L1 M1 L2 M2` | The browser calls each listener, so the stack empties between them and microtasks run |
| **`button.click()` in code** | `L1 L2 M1 M2` | Your script is still on the stack, so microtasks wait until all listeners finish |

---

## requestAnimationFrame

```js
setTimeout(() => console.log('timeout'), 0)
requestAnimationFrame(() => console.log('rAF'))
Promise.resolve().then(() => console.log('micro'))
```

- **`micro` always comes first.**
- **`timeout` and `rAF` can come in either order.** rAF runs just before the next **paint** (~16 ms).
- **Use rAF for animations** and visual updates, because it's synced with the screen refresh.

---

## Quick Q&A

**Q: Is JavaScript single-threaded? Then how is it async?**
JS runs on one thread. The **browser** does the waiting (timers, network), and the event loop puts callbacks back on the stack when it's free.

**Q: Does `setTimeout(fn, 0)` run immediately?**
No. It runs after the current code **and** all microtasks. Nested timers (5+ levels) are clamped to **at least 4 ms**, and background tabs are throttled to about **1 second**.

**Q: Microtask vs macrotask?**
Microtasks (promises, `await`) run **right after the current task, all of them**. Macrotasks (timers, events) run **one per loop turn**.

**Q: Is `setTimeout`'s delay guaranteed?**
No. It's the **minimum** delay. If the stack is busy, it waits longer.

**Q: What's synchronous inside an `async` function?**
Everything **before the first `await`**.

**Q: Why does a long loop freeze the page?**
Rendering and events only happen when the stack is empty. Split the work up, or use a **Web Worker**.

**Q: What's `queueMicrotask`?**
A direct way to add a microtask, like `Promise.resolve().then(fn)` without creating a promise.

---

## 🎯 Interview answer

> "JavaScript runs on a single thread with one call stack. Async work like timers, network requests and DOM events is handled by browser Web APIs, and when it finishes, the callback goes into a queue. There are two kinds of queues: the macrotask queue, for `setTimeout`, `setInterval` and events, and the microtask queue, for promise callbacks, code after `await`, and `queueMicrotask`. The event loop runs one macrotask, the first one being the script itself, then drains all microtasks, including ones added along the way, then gives the browser a chance to render, running `requestAnimationFrame` callbacks before painting, and then repeats. That's why synchronous code runs first, then promises, then timers. For example, logging 1, scheduling a `setTimeout` for 2, a promise for 3, and logging 4 prints 1, 4, 3, 2. It also explains why long synchronous code freezes the page, and why endless microtasks can starve rendering."
