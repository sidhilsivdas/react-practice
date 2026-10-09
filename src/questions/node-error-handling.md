## Short answer

**How you catch an error depends on the style of the code:**

| Code style | How to handle errors |
|---|---|
| Synchronous | `try / catch` |
| Callbacks | **Error-first callbacks**: check `err` first |
| Promises | `.catch()` |
| `async/await` | `try / catch` around `await` |
| EventEmitters / streams | `.on('error', ...)` |
| Anything missed | `process.on('unhandledRejection')` / `'uncaughtException'`: **log and restart** |

**Two kinds of errors:**

- **Operational errors:** expected problems (network down, invalid input, file not found). **Handle them** and return a good response.
- **Programmer errors:** bugs (reading a property of `undefined`). **Fix the code.** The process may be in a bad state, so crash and restart.

---

## Error-first callbacks

**Node's classic callback convention:** the **first argument is the error** (or `null`), and the result comes second.

```js
const fs = require('fs')

fs.readFile('config.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Could not read config:', err.message)   // ✅ always check err first
    return
  }
  console.log(JSON.parse(data))
})
```

**`try/catch` does NOT catch errors from callbacks**, because the callback runs later, after `try` has finished:

```js
try {
  fs.readFile('missing.txt', (err, data) => {
    if (err) throw err          // ❌ not caught by the try below → crashes the process
  })
} catch (e) {
  // never runs for the async error
}
```

---

## Promises & async/await

```js
const fs = require('fs/promises')

// async/await (most common today)
async function loadConfig() {
  try {
    const text = await fs.readFile('config.json', 'utf8')
    return JSON.parse(text)                 // a bad JSON error is caught too
  } catch (err) {
    if (err.code === 'ENOENT') return {}    // operational: file missing → use defaults
    throw err                               // unknown: let the caller handle it
  }
}

// promise chain
fetchUser(1)
  .then((user) => console.log(user))
  .catch((err) => console.error(err))
```

**Convert an old callback API to promises:**

```js
const { promisify } = require('util')
const sleep = promisify(setTimeout)
```

**Parallel work:** `Promise.all` rejects on the **first** error; use `Promise.allSettled` to get every result, success or failure.

---

## Custom error classes

```js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = true           // expected, safe to show the message to users
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404)
  }
}

throw new NotFoundError('User')        // err.statusCode === 404
```

**Always throw `Error` objects**, not strings: `throw 'oops'` has no stack trace.

---

## Express error handling

```js
// route: pass errors to next()
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) throw new NotFoundError('User')
    res.json(user)
  } catch (err) {
    next(err)                            // → error middleware
  }
})

// error middleware: 4 arguments, registered LAST
app.use((err, req, res, next) => {
  const status = err.statusCode || 500
  console.error(err)                     // log full details on the server
  res.status(status).json({
    message: err.isOperational ? err.message : 'Something went wrong',   // hide internals
  })
})
```

**Express 5 forwards rejected promises from async handlers to the error middleware automatically.** In Express 4 you need `try/catch` + `next(err)`, or a wrapper:

```js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

app.get('/users', asyncHandler(async (req, res) => {
  res.json(await User.find())
}))
```

---

## Global safety nets

```js
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection')
  // since Node 15 this crashes the process by default, which is good: don't hide it
})

process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught exception')
  process.exit(1)                        // ⚠️ state may be corrupted → exit, let PM2/Docker restart
})
```

**Don't use `uncaughtException` to "keep the server running".** After an unexpected error, memory and connections may be broken. **Log it, exit, and let a process manager restart it.**

---

## Best practices

1. **Always handle errors** at every async boundary: callbacks, promises, streams, EventEmitters.
2. **Use custom error classes** with status codes.
3. **Use central error middleware** in Express.
4. **Never leak stack traces** or internal messages to API users.
5. **Log with context** (request ID, user ID) using a structured logger like pino or winston.
6. **Validate input early** (zod, joi) to turn bad input into clean 400 errors.
7. **Crash on programmer errors** and run under PM2, Docker or Kubernetes so the process restarts.

---

## Quick Q&A

**Q: What is an error-first callback?**
The callback's first parameter is an error (or null) and the result comes after: `(err, data) => {}`. Always check `err` first.

**Q: Why doesn't try/catch catch callback errors?**
The callback runs later, on a different turn of the event loop, after the try block has finished.

**Q: Operational vs programmer errors?**
Operational errors are expected runtime problems you handle (timeouts, bad input). Programmer errors are bugs; you fix them, and the process should usually restart.

**Q: What happens with an unhandled promise rejection?**
Since Node 15, the process crashes by default. Handle rejections, and log in a `process.on('unhandledRejection')` handler.

**Q: How do you handle errors in Express?**
Pass them to `next(err)` (automatic for async handlers in Express 5) and handle them in a single error middleware with four arguments, registered after all routes.

---

## 🎯 Interview answer

> "Error handling in Node depends on the async style: try/catch for synchronous code and async/await, `.catch` for promise chains, checking the first argument in error-first callbacks, and `'error'` listeners on streams and emitters, because an unhandled `'error'` event crashes the process. try/catch can't catch errors thrown inside callbacks, since they run later. I separate operational errors, like invalid input or a missing record, which I handle and turn into proper HTTP responses, from programmer errors, which are bugs. I use custom error classes with status codes, and in Express I pass errors to `next` and handle them in one error middleware registered last, which logs the details and returns a safe message; Express 5 forwards async errors automatically. As a safety net I log in `unhandledRejection` and `uncaughtException` handlers, but after an uncaught exception I exit and let PM2 or Kubernetes restart the process, because its state may be corrupted."
