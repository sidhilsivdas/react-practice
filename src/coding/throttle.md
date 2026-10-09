## Problem

Write `throttle(fn, wait)` that returns a **new function** which runs `fn` **at most once every `wait` ms**.

- **The first call runs immediately.**
- **Calls during the next `wait` ms are ignored.**
- **After `wait` ms, the next call runs again.**

## Examples

```js
const onScroll = throttle(() => console.log('scroll handled'), 200)

// user scrolls: 50 scroll events in 1 second
// → "scroll handled" logs about 5 times (once every 200ms), not 50
```

| | **Debounce** | **Throttle** |
|---|---|---|
| Runs | once, **after** calls stop | at most once **every X ms**, **during** activity |
| Use for | search box, autosave | scroll, resize, mouse move, button spam |

## Hints

1. **Remember whether you're in the "cool-down" period.** A boolean flag or the last run time works.
2. **Start a timer** that ends the cool-down after `wait` ms.

<!-- SOLUTION -->

## Flag + timer

```js
function throttle(fn, wait) {
  let waiting = false                     // are we in the cool-down?

  return function (...args) {
    if (waiting) return                   // ignore calls during cool-down
    fn.apply(this, args)                  // run now
    waiting = true
    setTimeout(() => {
      waiting = false                     // cool-down over
    }, wait)
  }
}
```

**Step by step** (`wait` = 200ms):

```
t=0     call → not waiting → RUN ✅ → waiting = true
t=50    call → waiting → ignored
t=150   call → waiting → ignored
t=200   timer → waiting = false
t=250   call → RUN ✅ → waiting = true
```

## Timestamp version

**No timer needed:** compare the time since the last run.

```js
function throttle(fn, wait) {
  let lastRun = 0

  return function (...args) {
    const now = Date.now()
    if (now - lastRun >= wait) {
      lastRun = now
      fn.apply(this, args)
    }
  }
}
```

**Same behaviour, and simpler.** Both versions keep state in a **closure**.

## Trailing call

**Follow-up:** "The last scroll position is lost if it happened during the cool-down. Make sure the **last** call also runs."

```js
function throttle(fn, wait) {
  let waiting = false
  let lastArgs = null

  return function throttled(...args) {
    if (waiting) {
      lastArgs = args                     // remember the latest call
      return
    }
    fn.apply(this, args)
    waiting = true

    setTimeout(() => {
      waiting = false
      if (lastArgs) {                     // run the last ignored call ("trailing")
        throttled.apply(this, lastArgs)
        lastArgs = null
      }
    }, wait)
  }
}
```

**Libraries like lodash's `_.throttle`** support both `leading` and `trailing` options.

## 🎯 Interview answer

> "Throttle limits a function to run at most once per time window, unlike debounce, which waits for calls to stop. I keep a `waiting` flag in a closure: if a call comes in while waiting, I ignore it; otherwise I call `fn.apply(this, args)`, set the flag, and start a timeout that clears it after `wait` milliseconds. An equivalent version stores the last run timestamp and compares it with `Date.now()`. A common follow-up is a trailing call, where I remember the arguments of ignored calls and run the latest one when the window ends, so the final scroll position isn't lost. It's used for scroll, resize, mousemove and preventing button spam."
