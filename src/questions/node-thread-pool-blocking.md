## Short answer

- **libuv's thread pool** is a small group of background threads (**4 by default**) that does work the OS can't do asynchronously: **file system**, **DNS lookups**, **some crypto** (`pbkdf2`, `scrypt`, `randomBytes`) and **zlib** compression.
- **Network I/O does NOT use the thread pool.** The OS handles sockets asynchronously.
- **Blocking the event loop** means running long **synchronous** JavaScript on the main thread. While it runs, **no other request, timer or callback can run**.

**Analogy: a bank** 🏦

- **The main thread** = the single **counter clerk** who talks to every customer.
- **The thread pool** = **4 back-office workers** for slow paperwork.
- **Blocking** = the clerk doing a 10-minute calculation **at the counter**. The whole queue waits.

---

## What uses the pool

| Operation | Thread pool? |
|---|---|
| `fs.readFile`, `fs.writeFile`, most `fs.*` async calls | ✅ yes |
| `dns.lookup` (used by `http.get('example.com')`) | ✅ yes |
| `crypto.pbkdf2`, `crypto.scrypt`, `crypto.randomBytes` (async versions) | ✅ yes |
| `zlib.gzip` and other async compression | ✅ yes |
| **TCP/HTTP sockets, database drivers over the network** | ❌ no, the OS (epoll/kqueue/IOCP) |
| **Timers** | ❌ no, the event loop |
| **Your JavaScript code** | ❌ no, always the main thread |

### The 4-thread limit, demonstrated

```js
const crypto = require('crypto')
const start = Date.now()

for (let i = 1; i <= 6; i++) {
  crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', () => {
    console.log(`hash ${i} done in ${Date.now() - start}ms`)
  })
}
// hashes 1–4 finish together (~4 threads in parallel)
// hashes 5–6 finish later: they waited for a free thread
```

**Increase the pool size** (before the pool is first used, best set when starting the app):

```bash
UV_THREADPOOL_SIZE=8 node app.js      # max 1024
```

**Too many slow file or crypto tasks can fill the pool**, making even simple `fs` calls wait.

---

## Blocking the loop

**Any long synchronous work on the main thread freezes the server:**

```js
const express = require('express')
const app = express()

app.get('/slow', (req, res) => {
  let sum = 0
  for (let i = 0; i < 5e9; i++) sum += i     // ❌ ~seconds of CPU on the main thread
  res.send(String(sum))
})

app.get('/health', (req, res) => res.send('ok'))   // ⏳ waits until /slow finishes!
```

**Common hidden blockers:**

| Blocker | Fix |
|---|---|
| `fs.readFileSync` etc. in request handlers | `fs.promises` async versions |
| `JSON.parse` / `JSON.stringify` of huge payloads | Stream-parse, paginate, limit the body size |
| Heavy loops, sorting huge arrays, image processing | Worker threads, or a separate service or queue |
| `crypto.pbkdf2Sync`, `bcrypt.hashSync` | The async versions (they use the thread pool) |
| Catastrophic regex backtracking (ReDoS), e.g. `/(a+)+$/` on attacker input | Safe regex patterns, input length limits |

---

## Detecting blocking

**Measure event loop delay** with the built-in `perf_hooks`:

```js
const { monitorEventLoopDelay } = require('perf_hooks')

const histogram = monitorEventLoopDelay({ resolution: 20 })
histogram.enable()

setInterval(() => {
  const p99 = histogram.percentile(99) / 1e6           // nanoseconds → ms
  if (p99 > 100) console.warn(`Event loop lag p99: ${p99.toFixed(1)}ms`)
  histogram.reset()
}, 5000)
```

**Other tools:**

- **`node --inspect`** + Chrome DevTools → CPU profile, to find the slow function.
- **`clinic.js doctor`** / **`0x`** flame graphs.
- **APM tools** (Datadog, New Relic) report event-loop lag.

---

## Fixing CPU-heavy work

```js
// ✅ Move CPU work to a worker thread
const { Worker } = require('worker_threads')

app.get('/report', (req, res) => {
  const worker = new Worker('./build-report.js', { workerData: req.query })
  worker.once('message', (report) => res.json(report))
  worker.once('error', (err) => res.status(500).send(err.message))
})
```

**Other options:**

- **Split work into chunks** with `setImmediate` between them, so I/O can run in between.
- **Use a job queue** (BullMQ + Redis) for background jobs.
- **Run more processes** (cluster / PM2), which helps throughput but doesn't fix one slow request.

---

## Quick Q&A

**Q: What runs on libuv's thread pool?**
File system operations, `dns.lookup`, async crypto like pbkdf2/scrypt/randomBytes, and zlib. Not network sockets.

**Q: Default thread pool size? How do you change it?**
4. Set `UV_THREADPOOL_SIZE` (up to 1024) before the pool is first used.

**Q: What does "blocking the event loop" mean?**
Running long synchronous code on the main thread, so no other callbacks (requests, timers, I/O) can run until it finishes.

**Q: How do you detect it in production?**
Measure event-loop delay with `perf_hooks.monitorEventLoopDelay`, use APM metrics, and profile with `--inspect` or clinic.js.

**Q: Does a bigger thread pool fix slow CPU-bound JavaScript?**
No. The pool only runs libuv tasks. Your JavaScript still runs on the main thread; move it to worker threads.

---

## 🎯 Interview answer

> "libuv has a thread pool, four threads by default and configurable with `UV_THREADPOOL_SIZE` up to 1024, used for operations without good OS-level async support: file system calls, `dns.lookup`, async crypto like pbkdf2 and scrypt, and zlib. Network sockets don't use it; the OS handles those with epoll, kqueue or IOCP. Because only four tasks run at once, many slow crypto or file operations can queue up behind each other. Separately, all our JavaScript runs on the main thread, so long synchronous work, like big loops, sync fs calls, huge JSON parsing or bad regexes, blocks the event loop and stalls every request. I avoid sync APIs in handlers, detect lag with `perf_hooks.monitorEventLoopDelay` and CPU profiles, and move CPU-heavy work to worker threads or a job queue."
