## Short answer

**Graceful shutdown means stopping the server cleanly:**

1. **Stop accepting new requests.**
2. **Let in-flight requests finish.**
3. **Close resources:** database connections, Redis, queues.
4. **Then exit**, with a **timeout** that force-exits if something hangs.

**Without it, a deploy or restart cuts off users mid-request** (failed payments, half-saved data, 502 errors).

**Analogy: closing a shop** 🏪

- **Lock the front door** (no new customers).
- **Let the people inside finish paying** (in-flight requests).
- **Turn off the lights and lock the safe** (close the DB).
- **If someone won't leave after 10 minutes**, security escorts them out (force exit).

---

## When it happens

**Your process receives a signal asking it to stop:**

| Signal | Sent by |
|---|---|
| **`SIGTERM`** | **Docker** (`docker stop`), **Kubernetes** (pod shutdown), systemd, most platforms |
| **`SIGINT`** | **Ctrl+C** in the terminal, and **PM2** |
| `SIGKILL` | Force kill: **can't be caught**, the process dies instantly |

**Kubernetes and Docker send `SIGTERM`, wait a grace period** (30s in Kubernetes by default, 10s for `docker stop`), **then send `SIGKILL`.** Your cleanup must finish within that time.

---

## Implementation

```js
const express = require('express')
const app = express()

let isShuttingDown = false

app.get('/health', (req, res) => {
  // load balancer / Kubernetes readiness check: stop sending traffic while shutting down
  res.status(isShuttingDown ? 503 : 200).send(isShuttingDown ? 'shutting down' : 'ok')
})

const server = app.listen(3000, () => console.log('listening on 3000'))

async function shutdown(signal) {
  if (isShuttingDown) return                      // ignore repeated signals
  isShuttingDown = true
  console.log(`${signal} received, shutting down gracefully...`)

  // safety net: force exit if cleanup hangs
  const forceExit = setTimeout(() => {
    console.error('Could not finish in time, forcing exit')
    process.exit(1)
  }, 10_000)
  forceExit.unref()                               // don't keep the process alive just for this timer

  // 1 + 2. stop new connections, wait for in-flight requests
  server.close(async (err) => {
    if (err) console.error(err)

    try {
      // 3. close resources
      await db.disconnect()
      await redis.quit()
      console.log('clean shutdown complete')
      process.exit(0)                             // 4. exit successfully
    } catch (e) {
      console.error('error during shutdown', e)
      process.exit(1)
    }
  })

  // idle keep-alive connections would otherwise keep server.close() waiting (Node 18.2+)
  server.closeIdleConnections()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

### Step by step

```
1. SIGTERM arrives
2. isShuttingDown = true → /health returns 503 → load balancer stops routing here
3. server.close() → refuse NEW connections, keep serving current requests
4. closeIdleConnections() → drop idle keep-alive sockets
5. last request finishes → close callback runs
6. close DB / Redis / message queue connections
7. process.exit(0)
   (or after 10s, the timer forces process.exit(1))
```

---

## Important details

| Detail | Why |
|---|---|
| **`server.close()` doesn't close existing keep-alive connections** | Idle sockets keep it waiting. Use `closeIdleConnections()` (Node 18.2+), or `closeAllConnections()` as a last resort. |
| **A force-exit timeout** | Something always hangs eventually: a slow query or a stuck socket |
| **`.unref()` on the timer** | Lets the process exit normally before the timeout fires |
| **Fail the readiness check first** | Gives the load balancer time to stop sending new traffic |
| **Stop background workers too** | Stop consuming queue jobs, finish the current job, and let the rest be retried by another instance |
| **Run `node` directly in Docker** | `CMD ["node", "server.js"]`. With `npm start` or a shell wrapper, the signal may never reach Node. |

---

## Kubernetes tip

**When a pod is told to stop, Kubernetes sends `SIGTERM` and removes the pod from the service at about the same time**, so a few requests can still arrive for a moment.

**Common practice:**

- **Fail readiness**, wait a few seconds (or use a `preStop` sleep hook), **then** close the server.
- **Make sure the total shutdown time is less than `terminationGracePeriodSeconds`** (30s by default).

---

## Quick Q&A

**Q: What is graceful shutdown?**
Handling a stop signal by refusing new requests, finishing in-flight ones, closing resources like DB connections, and exiting, with a timeout as a safety net.

**Q: Which signals should you handle?**
`SIGTERM` (Docker, Kubernetes, most platforms) and `SIGINT` (Ctrl+C, PM2). `SIGKILL` can't be caught.

**Q: What does `server.close()` do?**
Stops accepting new connections and calls back when all existing connections have ended. Idle keep-alive connections can delay it, so call `closeIdleConnections()`.

**Q: Why a force-exit timeout?**
Hung requests or connections could block shutdown forever, and the orchestrator will `SIGKILL` the process anyway after its grace period.

**Q: Why does my app ignore Ctrl+C or `docker stop`?**
Either no signal handler cleans up the open handles, or Node isn't PID 1 in the container (started through `npm` or a shell), so it never receives the signal.

---

## 🎯 Interview answer

> "Graceful shutdown means that when the process gets SIGTERM, which Docker and Kubernetes send, or SIGINT from Ctrl+C or PM2, it stops cleanly instead of dropping requests. I first mark the app as shutting down so the health check returns 503 and the load balancer stops routing traffic, then call `server.close()`, which refuses new connections but lets in-flight requests finish, plus `closeIdleConnections()` so idle keep-alive sockets don't keep it waiting. When the close callback fires, I close database, Redis and queue connections and exit with code 0. I also start a force-exit timer, unref'd, of around ten seconds, because something can always hang, and Kubernetes will SIGKILL the pod after its grace period, 30 seconds by default. In Docker I run node directly so it receives the signal, and background workers stop taking new jobs and finish the current one."
