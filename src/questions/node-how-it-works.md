## Short answer

**Node.js runs JavaScript outside the browser**, mainly for servers. It's built from:

- **V8:** Google's JavaScript engine (the same one Chrome uses). It runs your JS code.
- **libuv:** a C library that provides the **event loop** and a **thread pool**, and talks to the operating system for files, network, timers and more.
- **Node's APIs:** `fs`, `http`, `crypto`, `stream` and so on, which connect your JS to libuv.

**The key idea:** your JavaScript runs on **one main thread**, but **slow I/O work (files, network, database) doesn't block it**. Node hands that work off and moves on, and the **event loop** runs your callback when the result is ready.

**Analogy: a restaurant with one waiter** 🍽️

- **The waiter (main thread)** takes an order, gives it to the **kitchen (OS / thread pool)**, and immediately serves the next table.
- **When a dish is ready**, the kitchen rings the bell (the event loop), and the waiter delivers it (runs your callback).
- **One waiter can serve many tables**, as long as they never stand still cooking a dish themselves (blocking work).

---

## Architecture

```
┌──────────────────────────────────────────────┐
│ Your JavaScript code                          │
├──────────────────────────────────────────────┤
│ Node.js APIs (fs, http, crypto, stream...)    │
├───────────────────────┬──────────────────────┤
│ V8 (runs JS,          │ libuv (event loop,    │
│ memory, garbage       │ thread pool, async    │
│ collection)           │ OS I/O)               │
├───────────────────────┴──────────────────────┤
│ Operating system (epoll / kqueue / IOCP)      │
└──────────────────────────────────────────────┘
```

| Part | Job |
|---|---|
| **V8** | Compiles and runs JavaScript, manages the heap and garbage collection |
| **libuv** | Event loop, **thread pool** (4 threads by default), non-blocking network I/O through the OS |
| **Bindings** | C++ glue between JS functions like `fs.readFile` and libuv |

---

## Non-blocking I/O

```js
const fs = require('fs')

console.log('1. start')

fs.readFile('big-file.txt', 'utf8', (err, data) => {
  console.log('3. file read, length:', data.length)    // runs later, when the file is ready
})

console.log('2. end')
// Output: 1. start → 2. end → 3. file read
```

**What happens:**

1. **`readFile` asks libuv to read the file** and returns **immediately**.
2. **The main thread keeps going** and logs "2. end".
3. **A thread-pool thread reads the file** in the background.
4. **When it's done, the callback is queued**, and the event loop runs it.

**Compare a blocking call:**

```js
const data = fs.readFileSync('big-file.txt', 'utf8')   // ❌ the whole server waits here
```

**On a server, one `readFileSync` while handling a request blocks every other user.** Use the async versions (`fs.promises.readFile`) in request handlers.

---

## Single-threaded?

**"Node is single-threaded" is only half true:**

| Runs on the main thread | Runs elsewhere |
|---|---|
| **All your JavaScript** (callbacks, request handlers, loops, JSON parsing) | **Network I/O:** the OS handles it (epoll/kqueue/IOCP), no threads needed |
| | **File system, DNS lookup, some crypto, zlib:** the **libuv thread pool** |
| | **Worker threads / cluster:** extra threads or processes you create |

**So:** Node is great at **many I/O-heavy requests** (APIs, chat, streaming), and weak at **CPU-heavy work** (image processing, big calculations) on the main thread, because that blocks everyone.

---

## Node vs threaded servers

| | **Node.js** (event loop) | **Traditional** (thread per request, e.g. older Java/PHP setups) |
|---|---|---|
| Concurrency model | One thread + event loop + async I/O | One thread (or process) per request |
| 10,000 idle connections | Cheap: just callbacks waiting | Expensive: 10,000 threads and their memory |
| CPU-heavy work | ❌ blocks everyone (use worker threads) | ✅ each request has its own thread |
| Shared state bugs | Fewer (one JS thread, no locks) | Race conditions and locks |
| Best for | APIs, real-time apps, streaming, BFFs | CPU-heavy work, or when the team and ecosystem fit |

---

## Quick Q&A

**Q: What is Node.js?**
A JavaScript runtime built on V8 and libuv that runs JS outside the browser, using an event-driven, non-blocking I/O model.

**Q: Is Node single-threaded?**
Your JavaScript runs on one main thread. libuv uses the OS for network I/O and a thread pool (4 threads by default) for file system, DNS, crypto and zlib work. You can add worker threads or processes for CPU-heavy tasks.

**Q: What is libuv?**
The C library that gives Node its event loop, thread pool, and cross-platform async I/O.

**Q: Why is Node good for I/O-heavy apps?**
While waiting for I/O, the thread isn't blocked, so one process can handle thousands of concurrent connections with little memory.

**Q: When is Node a bad fit?**
CPU-heavy work on the main thread (video encoding, heavy maths), unless you move it to worker threads or another service.

**Q: Browser JS vs Node?**
Same language, different APIs: the browser has `window`, the DOM and `fetch` (Node has `fetch` too since v18); Node has `fs`, `process`, `Buffer`, `http` and access to the operating system.

---

## 🎯 Interview answer

> "Node.js is a JavaScript runtime built on Google's V8 engine and the libuv library. V8 compiles and runs the JavaScript, and libuv provides the event loop, a thread pool and cross-platform asynchronous I/O. Our JavaScript runs on a single main thread, but I/O isn't blocking: when we read a file or make a network call, Node hands it off, network I/O to the operating system's async mechanisms and file system, DNS, crypto and zlib work to libuv's thread pool, which has four threads by default, and keeps executing other code. When the operation completes, its callback is queued and the event loop runs it. That makes Node very efficient for I/O-heavy workloads like APIs and real-time apps, because thousands of connections cost only callbacks, not threads. The trade-off is CPU-heavy synchronous work, which blocks the main thread for every user, so I avoid sync APIs in request handlers and move heavy computation to worker threads or separate services."
