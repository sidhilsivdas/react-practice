## Short answer

**`process`** is a global object describing the **running Node.js process**: environment variables, command-line arguments, memory, exit codes, signals, and the **`nextTick`** queue.

**The timing functions, from soonest to latest:**

| Function | Runs | Queue |
|---|---|---|
| **`process.nextTick(fn)`** | **Right after the current code**, before anything else | nextTick queue (Node only) |
| **`Promise.then` / `queueMicrotask`** | After the nextTick queue | Microtask queue |
| **`setTimeout(fn, 0)`** | In the next loop's **timers** phase | Timers |
| **`setImmediate(fn)`** | In the **check** phase, right after poll | Check |

**Analogy: a doctor's clinic** 🏥

- **`process.nextTick`** = "Doctor, one quick thing **before** you call the next patient."
- **Promises** = the nurse's urgent notes, read right after that.
- **`setTimeout` / `setImmediate`** = patients waiting in the **waiting room** for their turn.

---

## The order, in code

```js
console.log('1. sync')

setTimeout(() => console.log('5/6. setTimeout'), 0)
setImmediate(() => console.log('5/6. setImmediate'))

Promise.resolve().then(() => console.log('4. promise'))
process.nextTick(() => console.log('3. nextTick'))

console.log('2. sync')
```

**Output (CommonJS):**

```
1. sync
2. sync
3. nextTick
4. promise
5/6. setTimeout / setImmediate   ← these two can swap in the main module
```

**Why:**

1. **Synchronous code runs first.**
2. **When the current operation finishes, Node empties the nextTick queue**, then the **promise** queue.
3. **The event loop continues:** timers phase, then poll, then check.

**Inside an I/O callback, `setImmediate` always runs before `setTimeout`**, because check comes right after poll. (See the **Node.js event loop phases** question.)

---

## Why nextTick exists

**Use it to run something "after this function, but before anything else happens"**, for example emitting an event **after** the caller has had a chance to attach listeners:

```js
const EventEmitter = require('events')

class Connection extends EventEmitter {
  constructor() {
    super()
    // ❌ this.emit('ready') here → nobody is listening yet
    process.nextTick(() => this.emit('ready'))   // ✅ runs after the constructor returns
  }
}

const conn = new Connection()
conn.on('ready', () => console.log('ready!'))   // attached in time ✅
```

**Another use:** making an API **always async**, so callbacks never run sometimes-sync, sometimes-async (which causes confusing bugs).

```js
function getUser(id, callback) {
  if (cache.has(id)) {
    return process.nextTick(callback, null, cache.get(id))   // stay async even when cached
  }
  db.find(id, callback)
}
```

---

## Starvation danger

**The nextTick queue is drained completely before the event loop moves on.** Recursive `nextTick` **blocks I/O forever**:

```js
function loop() {
  process.nextTick(loop)     // ❌ the event loop never reaches the poll phase → server frozen
}
loop()
```

✅ **For "do this soon, but let I/O happen first", use `setImmediate`.**

**Naming confusion (the Node docs admit it):** `nextTick` fires **immediately**, and `setImmediate` fires on the **next** loop iteration. The names are effectively swapped.

> **Note:** in **ES modules** (`.mjs`), top-level code runs inside a promise job, so a promise callback can run **before** `nextTick`. Interview questions usually assume CommonJS.

---

## The process object

```js
process.env.PORT              // environment variables (always strings!)
process.env.NODE_ENV          // 'production' / 'development'
process.argv                  // ['node', '/path/app.js', '--port', '3000']
process.cwd()                 // current working directory
process.pid                   // process id
process.platform              // 'linux', 'win32', 'darwin'
process.memoryUsage()         // { rss, heapTotal, heapUsed, external, ... }
process.uptime()              // seconds since start
process.hrtime.bigint()       // high-precision time for measuring durations
```

### Exit codes

```js
process.exitCode = 1          // ✅ exit with code 1 when the work finishes naturally
process.exit(1)               // ⚠️ exits IMMEDIATELY: pending writes/logs may be lost
```

**`0` means success**, and anything else means failure. CI pipelines, Docker and PM2 read this.

### Signals and global errors

```js
process.on('SIGTERM', () => {            // sent by Docker / Kubernetes / PM2 to stop
  server.close(() => process.exit(0))    // graceful shutdown
})

process.on('uncaughtException', (err) => {
  logger.fatal(err)
  process.exit(1)                        // state may be corrupted → restart
})

process.on('unhandledRejection', (reason) => {
  logger.error(reason)                   // since Node 15 this crashes the process by default
})
```

---

## Quick Q&A

**Q: `process.nextTick` vs `setImmediate`?**
`nextTick` runs right after the current operation, before promises and before the event loop continues. `setImmediate` runs in the check phase of the event loop, after I/O polling.

**Q: `nextTick` vs `Promise.then`?**
Both are microtask-like, but in CommonJS the nextTick queue is drained first.

**Q: Why can `nextTick` be dangerous?**
Recursive `nextTick` starves the event loop, so I/O never runs. Use `setImmediate` for recursive or deferred work.

**Q: `process.exit()` vs `process.exitCode`?**
`exit()` stops immediately, possibly cutting off pending async work like log writes. Setting `exitCode` lets Node exit naturally with that code.

**Q: How do you read command-line arguments?**
`process.argv.slice(2)`, or the built-in `util.parseArgs`, or a library like yargs or commander.

**Q: Why are `process.env` values strings?**
Environment variables are always text. Convert them yourself: `Number(process.env.PORT) || 3000`.

---

## 🎯 Interview answer

> "`process` is a global object for the running Node process. It gives access to environment variables, command-line arguments, memory usage, the process id, exit codes and OS signals like SIGTERM, plus global handlers for uncaught exceptions and unhandled rejections. `process.nextTick` schedules a callback to run right after the current operation completes, before promise callbacks and before the event loop moves to its next phase. `setImmediate` runs in the check phase, after I/O polling, and `setTimeout(fn, 0)` runs in the timers phase. So the order is synchronous code, then nextTick callbacks, then promise microtasks, then timers or immediates. nextTick is useful for emitting events after a constructor returns or keeping an API consistently asynchronous, but because the queue is fully drained before the loop continues, recursive nextTick calls can starve I/O, so for deferring repeated work I use setImmediate."
