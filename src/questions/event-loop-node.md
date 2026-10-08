## Short answer

Node's event loop goes around in a **circle of 6 phases**. **Each phase has its own queue** of callbacks.

**Between every single callback**, Node empties two special queues: **`process.nextTick` first, then promises**.

**Analogy:** a **bus driving a fixed route with 6 stops.** At each stop it picks up only the passengers waiting at **that** stop. VIPs (`nextTick` and promises) get served **between every passenger**.

---

## The 6 phases

```
   ┌───────────────────────────┐
┌─▶│        1. timers          │  setTimeout, setInterval callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │   2. pending callbacks    │  some deferred system errors (e.g. TCP ECONNREFUSED)
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     3. idle, prepare      │  internal use only
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │         4. poll           │  ⭐ I/O callbacks (fs, network); waits here if idle
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │         5. check          │  ⭐ setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
└──┤    6. close callbacks     │  socket.on('close'), etc.
   └───────────────────────────┘

  Between EVERY callback:  nextTick queue → promise microtask queue
```

| Phase | Runs | Example |
|---|---|---|
| **1. Timers** | callbacks whose time is **up** | `setTimeout(fn, 100)` |
| **2. Pending callbacks** | system errors deferred from the last loop | TCP `ECONNREFUSED` |
| **3. Idle / prepare** | Node internals | — (not your code) |
| **4. Poll** ⭐ | **I/O callbacks** | `fs.readFile`, HTTP request data |
| **5. Check** ⭐ | **`setImmediate`** | `setImmediate(fn)` |
| **6. Close callbacks** | "close" events | `socket.on('close', fn)` |

---

## Poll phase

Poll is where Node **spends most of its time**:

1. **It runs any I/O callbacks that are ready**, such as finished file reads or network data.
2. **If there are none:**
   - **If a `setImmediate` is waiting**, it moves on to **check** straight away.
   - **Otherwise it waits for I/O to arrive**, but only until the **nearest timer** is due. Then it goes around to the **timers** phase.

That's why **`setImmediate` means "right after poll"**.

---

## nextTick & promises

These **aren't phases**. They run **after every single callback**, in any phase:

```
callback → [ all nextTicks ] → [ all promises ] → next callback
```

| Queue | Priority | Added by |
|---|---|---|
| **nextTick queue** | 🥇 first | `process.nextTick(fn)` |
| **Promise microtask queue** | 🥈 second | `.then`, `await`, `queueMicrotask` |

**Name confusion (even the Node docs admit it):**

- **`process.nextTick`** runs **immediately**, before anything else.
- **`setImmediate`** runs on the **next** loop turn, in the check phase.

The names are effectively swapped. 🙃

---

## Everything together

```js
console.log('start')
setTimeout(() => console.log('timeout'), 0)
setImmediate(() => console.log('immediate'))
Promise.resolve().then(() => console.log('promise'))
process.nextTick(() => console.log('nextTick'))
console.log('end')
```

**Output (verified on Node v24):**

```
start
end
nextTick
promise
timeout     ← these two can swap!
immediate   ←
```

**Step by step:**

1. **Sync code:** `start`, `end`.
2. **Script finished, so the VIP queues run:** `nextTick` first, then `promise`.
3. **The loop starts. The timers phase** runs `timeout`, if 1 ms has already passed.
4. **Poll** has nothing to do, so the loop moves to **check**, which runs `immediate`.

**Why can `timeout` and `immediate` swap?** `setTimeout(fn, 0)` is really **1 ms**. If the loop reaches the timers phase before 1 ms has passed, the timer isn't ready yet, so the loop skips to **check**. In 20 test runs, `immediate` came first 11 times and `timeout` 9 times.

---

## setTimeout vs setImmediate

**Inside an I/O callback, `setImmediate` always wins:**

```js
const fs = require('fs')

fs.readFile(__filename, () => {
  console.log('readFile')
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))
  process.nextTick(() => console.log('nextTick'))
  Promise.resolve().then(() => console.log('promise'))
})
```

**Output (always):**

```
readFile
nextTick
promise
immediate
timeout
```

**Why:**

- **We're inside the poll phase.**
- **The next phase is check**, so `immediate` runs first.
- **Timers come only on the next loop turn.**

---

## Microtasks between timers

```js
setTimeout(() => {
  console.log('t1')
  Promise.resolve().then(() => console.log('p1'))
  process.nextTick(() => console.log('tick1'))
}, 0)

setTimeout(() => {
  console.log('t2')
  Promise.resolve().then(() => console.log('p2'))
}, 0)
```

**Output:** `t1  tick1  p1  t2  p2`

- **Both timers are in the same timers phase**, but the VIP queues run **between them**.
- **On Node ≤10 the output was `t1 t2 tick1 p1 p2`**: microtasks ran only at the end of the phase.
- **Node 11 changed this to match browsers.** It's a popular trick question.

---

## nextTick vs promise

```js
Promise.resolve().then(() => {
  console.log('p1')
  process.nextTick(() => console.log('tick inside p1'))
})
Promise.resolve().then(() => console.log('p2'))

process.nextTick(() => {
  console.log('tick1')
  Promise.resolve().then(() => console.log('p inside tick1'))
})
process.nextTick(() => console.log('tick2'))
```

**Output:**

```
tick1
tick2
p1
p2
p inside tick1
tick inside p1
```

1. **The whole nextTick queue runs first:** `tick1` (which queues a promise), then `tick2`.
2. **Then the whole promise queue runs:** `p1` (which queues a nextTick), `p2`, then `p inside tick1`.
3. **Promises are done, so Node checks nextTick again:** `tick inside p1`.

> ⚠️ In **ES modules** (`.mjs`), promises run **before** nextTick for top-level code, because modules run inside a promise job. Interview questions usually assume CommonJS (`require`).

---

## Starvation

**A `setImmediate` added during the check phase waits a full loop:**

```js
setImmediate(() => {
  console.log('immediate 1')
  setImmediate(() => console.log('immediate 3 (added during check)'))
  setTimeout(() => console.log('timeout (added during check)'), 0)
})
setImmediate(() => console.log('immediate 2'))
```

**Output:** `immediate 1, immediate 2, timeout (added during check), immediate 3 (added during check)`

**But recursive `nextTick` starves the loop:**

```js
// ❌ I/O never runs: nextTick queue is never empty
function bad() { process.nextTick(bad) }
bad()

// ✅ I/O still gets a turn each loop
function good() { setImmediate(good) }
good()
```

**For recursive or long-running work, use `setImmediate`, not `nextTick`.**

---

## Browser vs Node

| | Browser | Node.js |
|---|---|---|
| Structure | task → microtasks → render | **6 phases** |
| `setImmediate` | ❌ (not standard) | ✅ check phase |
| `process.nextTick` | ❌ | ✅ runs before promises |
| Rendering step | ✅ rAF, paint | ❌ |
| Microtasks after each callback | ✅ | ✅ (since Node 11) |
| Powered by | browser engine | **libuv** (C library) |

---

## Quick Q&A

**Q: Name the event loop phases.**
Timers → pending callbacks → idle/prepare → **poll** → **check** → close callbacks.

**Q: What runs in the check phase?**
`setImmediate` callbacks, right after poll.

**Q: What happens in the poll phase?**
It runs I/O callbacks. If there's nothing to do, it either moves on to check (if a `setImmediate` is waiting) or waits for I/O until the next timer is due.

**Q: `setTimeout(fn, 0)` vs `setImmediate`?**
In the main module the order is **unpredictable**. Inside an **I/O callback**, `setImmediate` always runs first.

**Q: `process.nextTick` vs `Promise.then`?**
Both run between callbacks, but the **nextTick queue is emptied first** (in CommonJS).

**Q: Why can `nextTick` be dangerous?**
Recursive `nextTick` **starves the loop**, so I/O never runs. Use `setImmediate` instead.

**Q: What library implements the loop?**
**libuv**. It also runs a thread pool (4 threads by default) for file system work, DNS and crypto.

---

## 🎯 Interview answer

> "Node's event loop, implemented by libuv, cycles through six phases, each with its own callback queue: timers for `setTimeout` and `setInterval`; pending callbacks for some deferred system errors; idle/prepare, which is internal; poll, where I/O callbacks run and where Node waits for new I/O when idle; check, for `setImmediate`; and close callbacks, for events like `socket.on('close')`. Between every callback, Node drains the `process.nextTick` queue first and then the promise microtask queue, and since Node 11 that happens after each individual callback, like in browsers. A classic example: `setTimeout(fn, 0)` versus `setImmediate` is unpredictable in the main module, but inside an I/O callback `setImmediate` always runs first, because check comes right after poll. And recursive `process.nextTick` can starve I/O, so `setImmediate` is safer for deferring heavy work."
