## Short answer

**`EventEmitter`** (from Node's built-in `events` module) lets objects **emit named events** and lets other code **listen** for them: the **publish/subscribe** pattern.

**Much of Node is built on it:** HTTP servers (`'request'`), streams (`'data'`, `'end'`, `'error'`), `process` (`'exit'`, `'SIGTERM'`) and sockets.

**Analogy: a YouTube channel** 📺

- **`on`** = subscribe to the channel.
- **`emit`** = the channel uploads a video, and **every subscriber is notified**.
- **`off`** = unsubscribe.

---

## Basic usage

```js
const EventEmitter = require('events')

const orders = new EventEmitter()

orders.on('placed', (order) => console.log('📧 email for order', order.id))
orders.on('placed', (order) => console.log('📦 reserve stock for', order.id))

orders.emit('placed', { id: 42 })
// 📧 email for order 42
// 📦 reserve stock for 42
```

**Listeners run synchronously, in the order they were added**, when `emit` is called.

### Extending it in your own class

```js
class Uploader extends EventEmitter {
  upload(file) {
    this.emit('start', file.name)
    // ...upload in chunks...
    this.emit('progress', 50)
    this.emit('done', file.name)
  }
}

const uploader = new Uploader()
uploader.on('progress', (pct) => console.log(`${pct}%`))
uploader.upload({ name: 'photo.png' })
```

---

## Main methods

| Method | Does |
|---|---|
| `on(event, fn)` / `addListener` | Subscribe |
| `once(event, fn)` | Subscribe for **one** call only |
| `off(event, fn)` / `removeListener` | Unsubscribe (**needs the same function reference**) |
| `emit(event, ...args)` | Call all listeners; returns `true` if there were any |
| `removeAllListeners(event?)` | Remove all listeners |
| `listenerCount(event)` | How many listeners |
| `prependListener(event, fn)` | Add to the **front** of the list |
| `setMaxListeners(n)` | Change the leak-warning limit |

```js
const handler = (msg) => console.log(msg)
emitter.on('msg', handler)
emitter.off('msg', handler)                  // ✅ same reference

emitter.on('msg', (m) => console.log(m))
emitter.off('msg', (m) => console.log(m))    // ❌ different function → not removed
```

### Wait for an event with a promise

```js
const { once } = require('events')

const [value] = await once(emitter, 'ready')     // resolves on the next 'ready'
```

---

## The 'error' event

**`'error'` is special: if it's emitted with no listener, Node throws, and the process crashes.**

```js
const emitter = new EventEmitter()
emitter.emit('error', new Error('boom'))   // ❌ uncaught → process crashes

emitter.on('error', (err) => console.error('handled:', err.message))   // ✅ always add one
```

**This is why you should always handle `'error'` on streams, sockets and servers.**

---

## Memory leak warning

**By default, adding more than 10 listeners for one event prints a warning:**

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 message listeners added. Use emitter.setMaxListeners() to increase limit
```

**It usually means a real bug**, for example adding a listener **on every request** and never removing it:

```js
// ❌ leaks: a new listener per request, never removed
app.get('/live', (req, res) => {
  bus.on('update', (data) => res.write(data))
})

// ✅ remove it when the client disconnects
app.get('/live', (req, res) => {
  const send = (data) => res.write(data)
  bus.on('update', send)
  req.on('close', () => bus.off('update', send))
})
```

**Only raise the limit** (`setMaxListeners`) when you really need many listeners. Don't use it to hide a leak.

---

## Sync, not async

**`emit` calls listeners synchronously.** A slow listener blocks the code that emitted:

```js
emitter.on('job', () => heavyWork())      // blocks the emitter
emitter.emit('job')
console.log('after emit')                  // waits until heavyWork() finishes
```

**To run a listener later**, defer it inside the listener: `setImmediate(() => heavyWork())`.

---

## Quick Q&A

**Q: What is EventEmitter?**
A class from the `events` module implementing pub/sub: `on`/`once` to listen, `emit` to trigger, `off` to remove. Streams, HTTP servers and `process` all extend it.

**Q: Are listeners called synchronously or asynchronously?**
Synchronously, in registration order, during `emit`.

**Q: What happens if you emit `'error'` without a listener?**
Node throws the error, which crashes the process unless it's caught.

**Q: What does `MaxListenersExceededWarning` mean?**
More than 10 listeners were added for one event, which is often a leak from adding listeners repeatedly without removing them.

**Q: How do you remove a listener?**
`off(event, sameFunctionReference)`. Anonymous inline functions can't be removed, so keep a reference.

**Q: EventEmitter vs DOM events?**
Similar idea, but EventEmitter has no bubbling or capturing, no `preventDefault`, and it's synchronous. (Node also has the web-style `EventTarget`.)

---

## 🎯 Interview answer

> "EventEmitter is Node's built-in implementation of the publish/subscribe pattern from the `events` module. You register listeners with `on` or `once`, trigger them with `emit` and any arguments, and remove them with `off` using the same function reference. Much of Node is built on it: HTTP servers, streams, sockets and `process`. Listeners run synchronously in the order they were added, so a slow listener blocks the emitter. Two gotchas: emitting `'error'` without a listener throws and crashes the process, so streams and servers should always have an error handler, and adding more than ten listeners to one event triggers `MaxListenersExceededWarning`, which usually signals a leak, like adding a listener per request without removing it on disconnect. `events.once` turns an event into a promise, which is handy with async/await."
