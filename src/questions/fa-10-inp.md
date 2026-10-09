## 📄 Original answer (PDF)

**Question:** What is Interaction to Next Paint (INP) and how do you optimize it in React?

**Answer:** INP measures the latency of all interactions (clicks, taps, typing). High INP is usually caused by long main-thread tasks blocking the UI. I optimize it by breaking up long tasks using `setTimeout`, Web Workers for heavy data processing, or React 18's concurrent features.

**Real-time example:** A 'Save All' button that processes 10,000 table rows synchronously, freezing the UI for 2 seconds (Poor INP). Offloading the processing to a Web Worker keeps the INP under 200ms.

---

## 💡 What INP measures

**INP = the time from a user interaction until the next frame is painted**, reported as roughly the **worst interaction** of the page visit (the 98th percentile for pages with many interactions). It **replaced FID in March 2024**. FID only measured the *first* input's delay.

```
click ─▶ [ input delay ] ─▶ [ processing: event handlers + React render ] ─▶ [ presentation delay: layout, paint ] ─▶ pixels
          main thread busy      your code                                       browser rendering work
```

| Rating | INP |
|---|---|
| ✅ Good | **≤ 200 ms** |
| ⚠️ Needs improvement | 200–500 ms |
| ❌ Poor | > 500 ms |

**Measured on real users at the 75th percentile.** Lab tools approximate it with **TBT** (Total Blocking Time).

---

## 💡 Fixes by phase

| Phase too long | Cause | Fix |
|---|---|---|
| **Input delay** | Main thread busy with other work (hydration, third-party scripts, timers) | Less JS (server components, code splitting), defer third parties, break up long tasks |
| **Processing** | Heavy handlers or big re-renders | Show feedback first and do the work later (yield), Web Worker, `useTransition`, memoisation or the React Compiler, colocated state, virtualised lists |
| **Presentation** | Huge DOM, expensive layout and style recalculation | Fewer DOM nodes, `content-visibility: auto`, avoid layout thrashing, CSS containment |

---

## 💡 Yield to the main thread

```js
// update the UI immediately, then do the heavy work in a later task
async function onSaveAll(rows) {
  setStatus('Saving…')                              // user sees feedback in the next paint
  await yieldToMain()                               // let the browser paint first

  for (let i = 0; i < rows.length; i += 500) {      // process in chunks
    processChunk(rows.slice(i, i + 500))
    await yieldToMain()                             // give input events a chance between chunks
  }
  setStatus('Saved')
}

function yieldToMain() {
  // scheduler.yield() (Chromium) continues with priority; fall back to setTimeout elsewhere
  if (globalThis.scheduler?.yield) return scheduler.yield()
  return new Promise((resolve) => setTimeout(resolve, 0))
}
```

---

## 💡 Web Worker version

**The PDF's fix: move the computation off the main thread entirely.**

```js
// saveWorker.js
self.onmessage = (event) => {
  const result = event.data.rows.map(validateAndTransform)   // 10,000 rows, no UI blocking
  self.postMessage(result)
}
```

```tsx
// component
const workerRef = useRef<Worker | null>(null)

useEffect(() => {
  workerRef.current = new Worker(new URL('./saveWorker.js', import.meta.url), { type: 'module' })
  workerRef.current.onmessage = (e) => submitToApi(e.data)
  return () => workerRef.current?.terminate()                  // cleanup
}, [])

const onSaveAll = () => {
  setStatus('Saving…')
  workerRef.current?.postMessage({ rows })
}
```

**Workers can't touch the DOM**, and data is copied between threads (use transferable objects for big buffers). **Comlink** makes worker APIs feel like normal function calls.

---

## 💡 React-specific causes

| Cause | Fix |
|---|---|
| **Huge client bundles and hydration** | Server components, partial hydration, `lazy()` |
| **One state change re-renders a big tree** | Colocate state; split contexts; selectors (Redux/Zustand) so components subscribe narrowly; `memo` or the React Compiler |
| **Rendering 10,000 rows** | Virtualisation (`@tanstack/react-virtual`) |
| **Synchronous filtering on each keystroke** | `useTransition` / `useDeferredValue` |
| **Third-party scripts** (tag managers, chat widgets) | Load after interaction or idle; audit them; Partytown |

---

## 💡 Measuring INP

- **Field:** `web-vitals` `onINP(cb, { reportAllChanges: true })` with **attribution**: it reports the slow element, the event type, and which phase was slow.
- **Lab:** DevTools Performance panel → interactions track. Look for **long tasks (> 50 ms)** in red.
- **React DevTools Profiler:** which components re-rendered, and why.
- **Long Animation Frames API (LoAF):** finds which scripts caused slow frames in the field.

---

## 🎯 Interview answer

> "INP, which replaced FID in 2024, measures how long it takes from a click, tap or keypress until the next frame is painted, roughly the worst interaction of a visit; good is under 200 milliseconds at the 75th percentile. It has three parts: input delay when the main thread is busy, processing time in our handlers and React renders, and presentation delay for layout and paint. I fix each one: ship less JavaScript and defer third-party scripts so the main thread is free; in handlers, update the UI first and yield before heavy work using `scheduler.yield` or `setTimeout`, chunk long loops, and move heavy computation to a Web Worker like the PDF's 10,000-row save; and in React, keep re-renders narrow with colocated state, selectors and memoisation or the React Compiler, mark expensive updates as transitions, and virtualise large lists. I measure with the web-vitals library's attribution in the field and the DevTools Performance panel and React Profiler in the lab."
