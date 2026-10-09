## Short answer

**Node has three ways to run work in parallel:**

| | **`worker_threads`** | **`child_process`** | **`cluster`** |
|---|---|---|---|
| What it creates | A **thread** inside the same process | A separate **process** (any program) | Several copies of **your app** |
| Memory | separate, but **can share** (`SharedArrayBuffer`) | fully separate | fully separate |
| Startup cost | light | heavy | heavy |
| Communication | `postMessage` (fast) | stdin/stdout, or IPC with `fork` | IPC |
| Best for | **CPU-heavy JS**: image resizing, parsing, hashing, maths | **running other programs**: `ffmpeg`, `git`, Python scripts, shell commands | **more HTTP throughput** across cores |

**Analogy: a kitchen** 👨‍🍳

- **Worker thread** = an **extra cook in the same kitchen**, sharing the fridge if needed.
- **Child process** = **hiring an outside caterer**: a separate business, so you talk by phone.
- **Cluster** = **opening more branches** of the same restaurant.

---

## Worker threads

**Move CPU-heavy work off the main thread, so the server stays responsive:**

```js
// main.js
const { Worker } = require('worker_threads')

function runFibInWorker(n) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./fib-worker.js', { workerData: n })
    worker.once('message', resolve)              // result from the worker
    worker.once('error', reject)
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`))
    })
  })
}

app.get('/fib/:n', async (req, res) => {
  const result = await runFibInWorker(Number(req.params.n))   // ✅ main thread stays free
  res.json({ result })
})
```

```js
// fib-worker.js
const { parentPort, workerData } = require('worker_threads')

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2)
}

parentPort.postMessage(fib(workerData))          // send the result back
```

**Key points:**

- **Data passed with `postMessage` is copied** (structured clone). Large buffers can be **transferred** instead of copied.
- **`SharedArrayBuffer` + `Atomics`** let threads share memory directly (advanced).
- **Creating a worker costs a few milliseconds**, so for many tasks use a **worker pool** (for example the `piscina` library) instead of one worker per request.

---

## Child processes

```js
const { spawn, exec, execFile, fork } = require('child_process')
```

| Function | Runs | Output | Use for |
|---|---|---|---|
| **`spawn`** | any command | **streams** (no size limit) | long-running commands, big output (`ffmpeg`) |
| **`exec`** | a command **in a shell** | **buffered** into one string (`maxBuffer` limit) | short commands with small output |
| **`execFile`** | a program directly, **no shell** | buffered | safer than `exec` for user input |
| **`fork`** | **a Node.js script** | streams + an **IPC channel** (`send` / `on('message')`) | Node-to-Node background work |

### spawn: stream the output

```js
const ffmpeg = spawn('ffmpeg', ['-i', 'input.mp4', 'output.webm'])
ffmpeg.stderr.on('data', (chunk) => console.log(chunk.toString()))   // progress
ffmpeg.on('close', (code) => console.log(`finished with code ${code}`))
```

### exec: get the result as a string

```js
const { promisify } = require('util')
const execAsync = promisify(exec)

const { stdout } = await execAsync('git rev-parse --short HEAD')
console.log('version', stdout.trim())
```

### fork: another Node script, with messaging

```js
// parent.js
const child = fork('./report.js')
child.send({ month: 'October' })
child.on('message', (report) => console.log('report ready', report))

// report.js
process.on('message', ({ month }) => {
  const report = buildReport(month)        // heavy work in a separate process
  process.send(report)
  process.exit(0)
})
```

### ⚠️ Command injection

```js
exec(`convert ${req.query.file} out.png`)        // ❌ file = "x.png; rm -rf /" runs BOTH commands

execFile('convert', [req.query.file, 'out.png']) // ✅ no shell: arguments aren't interpreted
```

**Never pass user input into `exec`.** Use `execFile` or `spawn` with an arguments array.

---

## Which one to choose?

```
Need to run ffmpeg / Python / a shell command?      → child_process (spawn / execFile)
CPU-heavy JavaScript inside a request?              → worker_threads (with a pool)
Use all CPU cores for more requests?                → cluster / PM2 cluster mode
Long background jobs that can wait (emails, PDFs)?  → a job queue (BullMQ + Redis) with separate workers
```

---

## Quick Q&A

**Q: Worker threads vs cluster?**
Worker threads are threads inside one process, ideal for offloading CPU-heavy tasks and able to share memory. Cluster runs multiple processes of your server sharing a port, to increase request throughput.

**Q: Worker threads vs child processes?**
Worker threads run JavaScript in the same process with lighter overhead and fast messaging. Child processes are separate OS processes and can run any program.

**Q: spawn vs exec?**
`spawn` streams output with no size limit and doesn't use a shell by default. `exec` runs in a shell and buffers all output into a string, with a `maxBuffer` limit.

**Q: spawn vs fork?**
`fork` is a special `spawn` for Node scripts that sets up an IPC channel, so parent and child can `send()` messages.

**Q: Do worker threads help with I/O?**
Rarely. Node's async I/O is already non-blocking. Worker threads are for CPU-bound work.

**Q: How do threads communicate?**
`postMessage` and `'message'` events (data is copied by structured clone, or transferred), or shared memory with `SharedArrayBuffer` and `Atomics`.

---

## 🎯 Interview answer

> "Node offers three parallelism tools. `worker_threads` creates threads inside the same process; each has its own event loop and V8 instance, they talk via `postMessage`, and they can share memory with SharedArrayBuffer. They're the right choice for CPU-heavy JavaScript like image processing or hashing, ideally through a worker pool such as Piscina, so the main thread keeps serving requests. `child_process` starts separate OS processes: `spawn` streams output and suits long-running commands like ffmpeg, `exec` runs in a shell and buffers output, `execFile` avoids the shell, which matters for injection safety, and `fork` runs another Node script with an IPC channel. `cluster` forks multiple copies of the server sharing a port to use all cores and increase throughput. So: other programs, child_process; CPU-bound JS, worker threads; more request capacity, cluster or PM2; and long background jobs, a queue."
