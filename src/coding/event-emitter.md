## Problem

Write a class `EventEmitter` (the **publish/subscribe** pattern) with these methods:

| Method | Does |
|---|---|
| `on(event, listener)` | Subscribe `listener` to `event` |
| `off(event, listener)` | Unsubscribe that listener |
| `emit(event, ...args)` | Call every listener for `event` with `args`, in the order they were added. Return `true` if there were listeners, otherwise `false`. |
| `once(event, listener)` | Subscribe, but run the listener **only the first time**, then remove it |

## Examples

```js
const emitter = new EventEmitter()

function greet(name) { console.log('Hello', name) }

emitter.on('greet', greet)
emitter.emit('greet', 'Sam')     // Hello Sam   → returns true
emitter.off('greet', greet)
emitter.emit('greet', 'Sam')     // (nothing)   → returns false

emitter.once('ready', () => console.log('ready!'))
emitter.emit('ready')            // ready!
emitter.emit('ready')            // (nothing)
```

**Real use:** Node's `EventEmitter`, DOM `addEventListener`, chat apps, and decoupling parts of an app.

## Hints

1. **Store listeners per event:** `{ greet: [fn1, fn2], ready: [fn3] }`. A `Map` of arrays works well.
2. **`once`:** wrap the listener in a function that **removes itself**, then calls the original.

<!-- SOLUTION -->

## Solution

```js
class EventEmitter {
  constructor() {
    this.events = new Map()                         // event name → array of listeners
  }

  on(event, listener) {
    if (!this.events.has(event)) this.events.set(event, [])
    this.events.get(event).push(listener)
    return this                                     // allows chaining: e.on(...).on(...)
  }

  off(event, listener) {
    const listeners = this.events.get(event)
    if (!listeners) return this
    // remove the listener, or the "once" wrapper around it
    this.events.set(event, listeners.filter((l) => l !== listener && l.original !== listener))
    return this
  }

  emit(event, ...args) {
    const listeners = this.events.get(event)
    if (!listeners || listeners.length === 0) return false
    ;[...listeners].forEach((listener) => listener.apply(this, args))   // copy: listeners may remove themselves
    return true
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper)                      // remove first...
      listener.apply(this, args)                    // ...then run
    }
    wrapper.original = listener                     // so off(event, listener) can remove it too
    return this.on(event, wrapper)
  }
}
```

## Key points

| Point | Why |
|---|---|
| **`Map` of arrays** | Several listeners per event, kept in the order they were added |
| **`off` uses the same function reference** | Like `removeEventListener`, an anonymous inline function can't be removed later |
| **Copy before looping in `emit`** | A `once` listener removes itself during the loop; looping over the original array would skip the next listener |
| **`once` wrapper** | Removes itself, then calls the real listener |
| **`wrapper.original`** | So `off(event, originalListener)` also cancels a pending `once` |
| **`return this`** | Allows chaining: `emitter.on('a', f).on('b', g)` |

**Step by step for `once`:**

```
once('ready', fn)  → on('ready', wrapper)          events: { ready: [wrapper] }
emit('ready')      → wrapper() → off(wrapper) → fn() runs ✅   events: { ready: [] }
emit('ready')      → no listeners → returns false
```

## Follow-ups

- **`on` returns an unsubscribe function** (the React-friendly style):

```js
subscribe(event, listener) {
  this.on(event, listener)
  return () => this.off(event, listener)
}

// in React
useEffect(() => emitter.subscribe('message', setMessage), [])   // cleanup = unsubscribe ✅
```

- **Memory leaks:** listeners that are never removed keep their components alive. Always unsubscribe in a cleanup.
- **Error handling:** wrap each listener call in `try/catch` so one failing listener doesn't stop the others.

## 🎯 Interview answer

> "I store listeners in a Map from event name to an array of functions. `on` pushes the listener and returns `this` for chaining. `off` filters out that exact function reference, so, like `removeEventListener`, you need the same reference you subscribed with. `emit` returns false if there are no listeners; otherwise it calls each listener with the arguments, iterating over a copy of the array because a `once` listener removes itself during the loop, and returns true. `once` registers a wrapper that unsubscribes itself and then calls the original; I store the original on the wrapper so `off` with the original function also works. In React I'd return an unsubscribe function from subscribe and call it in a useEffect cleanup to avoid leaks."
