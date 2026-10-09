## Short answer

**A Node process runs your JavaScript on one CPU core.** On an 8-core server, 7 cores sit idle.

**The `cluster` module starts several copies of your app (workers), one per core, all sharing the same port.** A primary process starts them and spreads incoming connections between them.

**Analogy: a supermarket** 🛒

- **One cashier (one Node process)** = a long queue, even though the shop has 8 tills.
- **Cluster** = **open all 8 tills** (workers). The **manager at the entrance (primary)** sends each customer to a free till.

---

## Basic example

```js
// server.js
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isPrimary) {                                   // (isMaster in older Node)
  const cpus = os.availableParallelism?.() ?? os.cpus().length
  console.log(`Primary ${process.pid} starting ${cpus} workers`)

  for (let i = 0; i < cpus; i++) cluster.fork()            // start one worker per core

  cluster.on('exit', (worker, code) => {
    console.log(`Worker ${worker.process.pid} died (code ${code}), starting a new one`)
    cluster.fork()                                         // ✅ self-healing
  })
} else {
  http
    .createServer((req, res) => res.end(`Handled by worker ${process.pid}\n`))
    .listen(3000)                                          // all workers share port 3000
  console.log(`Worker ${process.pid} started`)
}
```

```
Primary 1000 starting 4 workers
Worker 1001 started
Worker 1002 started
...
curl localhost:3000 → Handled by worker 1003
curl localhost:3000 → Handled by worker 1001
```

---

## How it works

```
                    ┌──────────────┐
  requests ───────▶ │   Primary    │   (doesn't handle requests itself)
   port 3000        │ load balancer│
                    └──────┬───────┘
          ┌────────────┬───┴────────┬────────────┐
          ▼            ▼            ▼            ▼
      Worker 1     Worker 2     Worker 3     Worker 4
     (own V8,     (own V8,     (own V8,     (own V8,
      memory,      memory,      memory,      memory,
      event loop)  event loop)  event loop)  event loop)
```

- **Each worker is a full, separate process** with its **own memory and event loop**.
- **The primary distributes connections round-robin** (the default everywhere except Windows).
- **Workers can message the primary** with `process.send()` / `worker.on('message')` (IPC).

---

## The shared-state problem ⭐

**Workers don't share memory.** Anything stored in a JavaScript variable exists **only in that worker**:

```js
let visits = 0                       // ❌ each worker has its own counter
app.get('/visits', (req, res) => res.send(String(++visits)))
// requests hit different workers → numbers jump around: 1, 1, 2, 1, 3...
```

**Problems this causes:**

| Problem | Fix |
|---|---|
| **In-memory sessions** (a user logs in on worker 1, the next request hits worker 2 → "logged out") | Store sessions in **Redis** or the database, or use stateless **JWTs** |
| **In-memory cache** (each worker has its own copy) | **Redis** |
| **WebSockets / Socket.IO** (a client's connection lives on one worker) | **Sticky sessions** + the Socket.IO Redis adapter |
| **Scheduled jobs** (cron runs in every worker → runs 4 times!) | Run jobs only in one process, or use a job queue |

**Rule: design the app to be stateless**, keeping state in Redis or the database. Then it scales across cores **and** across machines.

---

## Cluster vs others

| | **Cluster** | **Worker threads** | **More servers / containers** |
|---|---|---|---|
| Unit | processes | threads in one process | machines / pods |
| Memory | separate | separate (can share with `SharedArrayBuffer`) | separate |
| Shares a port | ✅ | ❌ | behind a load balancer |
| Best for | **more HTTP throughput** on one machine | **CPU-heavy tasks** inside a request | **scaling beyond one machine** |

**In practice:** many teams don't write cluster code themselves. They use **PM2 cluster mode** (`pm2 start app.js -i max`), or run **one Node process per container** and let **Kubernetes** scale the containers.

---

## Zero-downtime restart

**Restart workers one at a time**, so some are always serving:

```js
// in the primary: on deploy, replace workers one by one
async function rollingRestart() {
  for (const worker of Object.values(cluster.workers)) {
    const replacement = cluster.fork()
    await new Promise((resolve) => replacement.once('listening', resolve))   // new one ready
    worker.disconnect()                    // old one finishes its current requests, then exits
  }
}
```

(PM2 does this for you with `pm2 reload`.)

---

## Quick Q&A

**Q: Why use the cluster module?**
Node runs your JavaScript on one core. Cluster forks one worker process per core, sharing a port, so the app uses every core and handles more requests.

**Q: How are requests distributed?**
The primary accepts connections and hands them to workers round-robin (the default except on Windows).

**Q: Do workers share memory?**
No. Each is a separate process with its own memory. Shared state must live in Redis or a database.

**Q: What happens if a worker crashes?**
The others keep serving. Listen to `cluster.on('exit')` and `fork()` a replacement.

**Q: Cluster vs worker threads?**
Cluster = multiple processes for more request throughput. Worker threads = threads inside one process for CPU-heavy tasks.

**Q: Does cluster make one slow request faster?**
No. It handles more requests in parallel; a single CPU-heavy request still blocks its own worker.

---

## 🎯 Interview answer

> "A single Node process runs JavaScript on one core, so the cluster module lets us use every core: the primary process forks one worker per CPU, each a separate Node process with its own memory and event loop, and they all listen on the same port, with the primary distributing connections round-robin by default. If a worker crashes, the others keep serving, and the primary can listen for the exit event and fork a replacement. Because workers don't share memory, the app must be stateless: sessions, caches and rate-limit counters go in Redis or the database, WebSockets need sticky sessions, and cron jobs must run in just one process. Cluster increases throughput but doesn't speed up a single CPU-bound request; that's what worker threads are for. In production I'd usually use PM2's cluster mode or one process per container scaled by Kubernetes, rather than hand-written cluster code."
