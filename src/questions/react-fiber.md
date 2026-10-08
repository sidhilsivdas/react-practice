## Short answer

**Fiber is how React splits rendering into small pieces of work it can pause, so the page never freezes.**

---

## Problem before Fiber

Imagine a chef who gets an order for 100 dishes and **refuses to stop until all 100 are done**. A new customer walks in and nobody greets them.

Old React worked the same way. It walked the whole tree **recursively in one go** and couldn't stop. A big update could block the browser for 100+ ms, so typing lagged and animations stuttered.

```
Old React:
[======== rendering whole tree, can't stop ========]
          ↑ user types here... nothing happens 😩
```

---

## What Fiber changed

Now the chef works **one dish at a time** and checks after each one: "Does anything urgent need me?"

```
Fiber:
[unit][unit][unit] → 🖱️ handle click → [unit][unit] → 🎨 paint → [unit]...
```

- **Each unit of work is a fiber**, usually one component or element.
- **After each unit, React checks** whether the browser needs time back.
- **If it does, React pauses**, then **resumes where it left off**.

---

## What a fiber is

**A plain JavaScript object, one per component or element:**

```js
{
  type: TimerPractice,
  props: {...},
  memoizedState: ...,   // your useState / useRef values live here!
  child:   <first child fiber>,
  sibling: <next sibling fiber>,
  return:  <parent fiber>,
}
```

- **The `child`, `sibling` and `return` links let React walk the tree step by step**, without recursion. To pause, React just remembers "I'm at this fiber".
- **Your hook state lives on the fiber.** That's how `useState` remembers values between renders.

---

## Render vs commit

| Render phase | Commit phase |
|---|---|
| Calls components, diffs trees | Updates the real DOM |
| **Can be paused, resumed or thrown away** | **Runs all at once, can't pause** |
| Nothing visible yet | User sees the result |

---

## Double buffering

- **current:** what's on screen.
- **work-in-progress:** the new version being built in the background.

When it's ready, React **swaps** them. It's like painting on a second canvas, then swapping, so viewers never see a half-finished painting.

---

## Priorities

| Update | Priority |
|---|---|
| Typing, clicking | 🔴 urgent |
| Filtering a 10,000-item list | 🟢 can wait |

```jsx
const [isPending, startTransition] = useTransition()
startTransition(() => setFilter(text))   // low priority, interruptible
```

---

## Why it matters

| Rule | Why Fiber causes it |
|---|---|
| Components must be **pure** | Render work may be paused, restarted or run twice |
| Side effects go in **`useEffect`** | Effects run after commit, when the work is final |
| **No hooks inside `if` or loops** | Hooks are stored on the fiber **in call order** |

---

## 🎯 Interview answer

> "Fiber is React's reconciliation engine, introduced in React 16. Before it, React rendered recursively and couldn't stop, so large updates blocked the main thread. Fiber represents each component as a fiber object linked to its child, sibling and parent, so React can process the tree one unit at a time, pause to let the browser handle urgent work, and resume later. Rendering is split into an interruptible render phase and a synchronous commit phase, and React uses double buffering with a current tree and a work-in-progress tree. This is what enables concurrent features like `useTransition` and update priorities. Hook state is also stored on the fiber, which is why hooks must be called in the same order every render."
