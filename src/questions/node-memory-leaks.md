## Short answer

**A memory leak is memory your app no longer needs but can't free**, because something still **holds a reference** to it, so the garbage collector won't clean it up.

**In a long-running Node server, memory then grows slowly**, maybe for hours or days, until the process becomes slow (constant garbage collection) or **crashes**: `JavaScript heap out of memory`.

**Analogy: a hotel that never checks guests out** 🏨

- **Guests (objects) leave**, but their names stay on the room list (references).
- **The cleaners (garbage collector) can't clean rooms that look occupied.**
- **Eventually there are no free rooms** (out of memory).

---

## How GC works

**V8's garbage collector frees objects that can't be reached** from the "roots": global variables, the current call stack, and active closures.

```js
function handle() {
  const big = new Array(1e6).fill('x')   // allocated
  return big.length
}                                         // after return, nothing references `big` → GC frees it ✅

const cache = []
function leak() {
  cache.push(new Array(1e6).fill('x'))   // ❌ cache (a global) keeps EVERY array forever
}
```

**So a leak means: something reachable keeps pointing to data you're done with.**

---

## Common causes

### 1. Unbounded caches / global maps

```js
const cache = {}
app.get('/user/:id', async (req, res) => {
  cache[req.params.id] ??= await db.getUser(req.params.id)   // ❌ grows with every new id, forever
  res.json(cache[req.params.id])
})
```

✅ **Fix:** an **LRU cache with a max size and TTL** (`lru-cache`), or **Redis**.

### 2. Event listeners that are never removed

```js
app.get('/stream', (req, res) => {
  bus.on('update', (data) => res.write(data))   // ❌ one more listener per request, never removed
})
```

✅ **Fix:** remove it with `bus.off(...)` on `req.on('close')`. The **`MaxListenersExceededWarning`** is a clue.

### 3. Timers that keep running

```js
function startPolling(user) {
  setInterval(() => check(user), 1000)    // ❌ never cleared → keeps `user` alive forever
}
```

✅ **Fix:** keep the ID and call `clearInterval` when you're done.

### 4. Closures holding big data

```js
function createHandler() {
  const hugeData = loadHugeFile()             // 200 MB
  return () => console.log('handler called')  // closure may keep hugeData's scope alive
}
handlers.push(createHandler())                 // ❌ stored forever
```

### 5. Growing arrays / queues

**Logs, metrics or messages pushed into an array and never trimmed.**

### 6. Not closing resources

**DB connections, file handles or sockets left open** (not strictly heap leaks, but they exhaust resources).

---

## Detecting leaks

### 1. Watch memory over time

```js
setInterval(() => {
  const { heapUsed, rss } = process.memoryUsage()
  console.log(`heap ${(heapUsed / 1e6).toFixed(1)} MB, rss ${(rss / 1e6).toFixed(1)} MB`)
}, 10000)
```

| Pattern | Meaning |
|---|---|
| Goes up and down (sawtooth), stays level overall | ✅ normal: GC is working |
| **Keeps climbing**, even after GC, under steady traffic | ❌ **leak** |

**In production, use monitoring** (Grafana, Datadog, New Relic) with memory graphs and alerts.

### 2. Heap snapshots (find what's leaking)

```bash
node --inspect server.js          # open chrome://inspect → Memory tab
```

1. **Take snapshot 1** after the app warms up.
2. **Send traffic** (for example with `autocannon`).
3. **Take snapshot 2**, more traffic, then **snapshot 3**.
4. **Compare snapshots:** look for objects whose **count keeps growing**, and check their **retainers** (what holds them).

**Snapshots from code** (for servers without DevTools access):

```js
const v8 = require('v8')
process.on('SIGUSR2', () => {
  console.log('heap snapshot written to', v8.writeHeapSnapshot())   // open the file in Chrome DevTools
})
```

### 3. Other tools

- **`clinic.js heapprofiler`** / **`clinic doctor`**.
- **`--heapsnapshot-near-heap-limit=2`**: automatically write snapshots right before running out of memory.
- **`--trace-gc`**: log every garbage collection.

---

## Prevention

1. **Give every cache a limit:** max size plus TTL (LRU), or use Redis.
2. **Remove listeners, clear timers, close connections** when done, especially on disconnect.
3. **Stream large data** instead of loading it all into memory.
4. **Use `WeakMap` / `WeakRef`** to attach data to objects without keeping them alive.
5. **Load test** and watch memory **before** releasing.
6. **Safety net:** PM2 `max_memory_restart`, or container memory limits plus auto-restart. **That buys time; it doesn't fix the leak.**

**Heap size limit:** `node --max-old-space-size=4096 app.js` (MB) raises V8's heap limit. It's useful for genuinely memory-heavy work, but it **doesn't fix leaks**.

---

## Quick Q&A

**Q: What is a memory leak in Node?**
Memory that's no longer needed but stays reachable through references, so the garbage collector can't free it, and memory grows until the process slows down or crashes.

**Q: Common causes?**
Unbounded caches and global collections, event listeners that are never removed, uncleared intervals, closures holding large objects, and arrays that grow forever.

**Q: How do you find a leak?**
Confirm a steady rise in `heapUsed` under constant load, then compare heap snapshots (Chrome DevTools via `--inspect`, or `v8.writeHeapSnapshot()`) to find objects that keep growing and see what retains them.

**Q: What does `--max-old-space-size` do?**
Raises V8's heap memory limit. It delays an out-of-memory crash but doesn't fix a leak.

**Q: `rss` vs `heapUsed`?**
`heapUsed` is memory used by JavaScript objects in V8's heap. `rss` is the total memory of the process, including code, stacks, Buffers and native memory.

---

## 🎯 Interview answer

> "A memory leak in Node is memory that's no longer needed but still reachable, so V8's garbage collector can't free it, and in a long-running server memory grows until GC slows everything down or the process crashes with a heap out-of-memory error. The usual causes are unbounded caches or global maps, event listeners added per request and never removed, intervals never cleared, closures retaining large objects, and arrays that only grow. To diagnose one, I first confirm that `heapUsed` keeps climbing under steady load in monitoring, then take heap snapshots with `--inspect` and Chrome DevTools, or `v8.writeHeapSnapshot` in production, before and after load, and compare them to find object types that keep growing and inspect their retainers. Fixes are bounded LRU caches or Redis, removing listeners and timers on disconnect, streaming large data, and WeakMaps. PM2's `max_memory_restart` or container limits are only a safety net."
