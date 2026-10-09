## 📄 Original answer (PDF)

**Question:** How do you identify, trace, and resolve memory leaks in a long-running Single Page Application?

**Answer:** Leaks happen via closures, detached DOM nodes, uncleared intervals, or event listeners. I use Chrome DevTools Memory tab to take Heap Snapshots before and after a route change. If a component unmounts but its nodes remain in the snapshot, it's a leak.

**Real-time example:** An infinite scrolling feed where developers attached `window.addEventListener('scroll')` inside a component but forgot the `removeEventListener` in the `useEffect` cleanup function, causing exponential listener accumulation and eventual browser crash.

---

## 💡 Fixing the PDF's example

```tsx
// ❌ leak: every mount adds another listener; none are ever removed
useEffect(() => {
  window.addEventListener('scroll', handleScroll)
}, [])

// ✅ fix: cleanup with the SAME function reference
useEffect(() => {
  const onScroll = () => setScrollY(window.scrollY)
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => window.removeEventListener('scroll', onScroll)
}, [])

// ✅ even simpler: one AbortController removes everything at once
useEffect(() => {
  const controller = new AbortController()
  window.addEventListener('scroll', onScroll, { signal: controller.signal })
  window.addEventListener('resize', onResize, { signal: controller.signal })
  return () => controller.abort()
}, [])
```

**For infinite scroll, use `IntersectionObserver`** on a sentinel element instead of scroll listeners (and call `observer.disconnect()` in the cleanup).

---

## 💡 Leak sources in React apps

| Source | Example | Fix |
|---|---|---|
| **Event listeners** | `window`/`document` listeners in components | Cleanup or an AbortController `signal` |
| **Timers** | `setInterval` polling never cleared | `clearInterval` in the cleanup |
| **Subscriptions** | WebSocket, EventSource, store `subscribe()`, `ResizeObserver` | `close()` / `unsubscribe()` / `disconnect()` |
| **Detached DOM nodes** | A third-party library (chart, map, editor) not destroyed on unmount | Call the library's `destroy()` in the cleanup |
| **Unbounded caches** | A module-level `Map` growing per item viewed | Bounded LRU, or TanStack Query's `gcTime` |
| **Closures holding big data** | Callbacks stored globally that capture large arrays | Remove the callbacks; avoid capturing big objects |
| **Global stores growing** | Redux arrays of every viewed item, toast history | Normalise, cap, prune |
| **Pending async work after unmount** | Fetch resolves and updates state on an unmounted component | `AbortController` in the cleanup |

**StrictMode's double-mount in development helps here:** setup → cleanup → setup exposes missing cleanups early (double listeners or intervals).

---

## 💡 DevTools workflow

1. **Reproduce:** a clean incognito window (no extensions), production build.
2. **Memory tab → Heap snapshot** (baseline).
3. **Perform the action several times:** navigate to the page and back 5–10×, open and close the modal.
4. **Force garbage collection** (the 🗑 button), then **take snapshot 2**.
5. **Compare:** choose **"Comparison"** view, sort by **# Delta**. Objects that keep growing are suspects.
6. **Filter by "Detached"** to find DOM nodes that are removed from the page but still referenced.
7. **Click an object → "Retainers"** panel: shows **who is holding it** (often a listener, closure or cache).

**Other tools:**

- **Performance monitor** (JS heap size and DOM node count over time; a sawtooth that keeps climbing = a leak).
- **Allocation instrumentation on timeline.**
- **`performance.memory`** (Chrome) / `measureUserAgentSpecificMemory()` for field monitoring.
- **MemLab** (Meta's tool) automates leak detection in E2E flows.

---

## 💡 Prevention

- **Every `useEffect` that subscribes or starts something returns a cleanup.** Make that a code-review rule.
- **Prefer libraries that handle cleanup** (TanStack Query, `useSyncExternalStore`-based stores).
- **Lint:** `react-hooks/exhaustive-deps`.
- **Long-running dashboards:** cap lists (virtualise, keep the last N items), set cache limits.
- **Add a memory check to E2E** for critical flows (MemLab or a heap-size assertion).

---

## 🎯 Interview answer

> "In SPAs, leaks usually come from effects that subscribe without cleaning up: window listeners, intervals, WebSockets, observers, or third-party widgets that aren't destroyed, plus unbounded caches, closures holding large data, and detached DOM nodes. For the PDF's infinite scroll example, the fix is returning a cleanup that removes the same function reference, or using an AbortController signal for all listeners, and better still an IntersectionObserver instead of scroll events. To find leaks I reproduce the action several times in a clean production build, take heap snapshots before and after with a forced GC, compare by delta, filter for detached nodes, and follow the retainers chain to see what's holding the memory. The Performance monitor shows if heap size and DOM nodes keep climbing, and MemLab can automate it in CI. Prevention is a review rule that every subscribing effect has a cleanup, StrictMode in development to surface missing cleanups, bounded caches, and libraries that manage subscriptions for you."
