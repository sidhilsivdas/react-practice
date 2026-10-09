## 📄 Original answer (PDF)

**Question:** How does React 18's Concurrent Mode help in scaling complex UIs, and how do you leverage it?

**Answer:** Concurrent React allows rendering to be interrupted. I use `useTransition` to mark non-urgent state updates (like filtering a massive list) and `useDeferredValue` to debounce UI renders without custom hooks.

**Real-time example:** A global search bar. Typing updates the input value immediately (urgent), but the API call and subsequent rendering of the 100 search results are wrapped in a transition (non-urgent), keeping the input typing smooth and avoiding browser lock-up.

---

## 💡 Terminology update

**"Concurrent Mode" was the experimental name.** React 18 shipped **concurrent features** (concurrent rendering), enabled by using `createRoot`. There's no separate "mode" to switch on, and it's opt-in **per update** through `startTransition`, `useDeferredValue` and Suspense. Saying "concurrent rendering" or "concurrent features" in the interview shows you're current.

**What it means:**

- **React can prepare a new UI in the background**, pause it, and throw it away if a more urgent update arrives.
- **The current screen stays interactive** in the meantime.

---

## 💡 useTransition

```tsx
function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  const visible = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [products, filter]
  )

  return (
    <>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)                          // urgent: the input updates immediately
          startTransition(() => setFilter(e.target.value))  // non-urgent: interruptible list render
        }}
      />
      <ul style={{ opacity: isPending ? 0.6 : 1 }}>          {/* old results stay visible, dimmed */}
        {visible.map((p) => <ProductRow key={p.id} product={p} />)}
      </ul>
    </>
  )
}
```

**React 19 bonus:** `startTransition(async () => { ... })` accepts **async** functions (Actions), so `isPending` covers the whole server round-trip.

---

## 💡 useDeferredValue

**Use it when you don't own the setter** (the value comes in as a prop), or prefer one line:

```tsx
function Results({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)        // lags behind while React is busy
  const isStale = query !== deferredQuery
  return (
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <SlowResultList query={deferredQuery} />          {/* should be memo()-ised to benefit */}
    </div>
  )
}
```

**Important difference from debounce:**

- **Debounce waits a fixed time**, even on a fast device.
- **A deferred value updates as soon as React has time**, so it's instant on a fast laptop and only lags on a slow phone.
- **It doesn't reduce network calls.** For API requests, still debounce or cancel them (AbortController / TanStack Query).

---

## 💡 Other concurrent features

| Feature | Scaling benefit |
|---|---|
| **Automatic batching** | Several state updates → one render, even in promises and timeouts |
| **Suspense for data + streaming SSR** | Independent loading boundaries; slow sections don't block the page |
| **Selective hydration** | The part the user interacts with hydrates first |
| **`useSyncExternalStore`** | External stores (Redux, Zustand) stay consistent during concurrent renders (no "tearing") |
| **`<Activity>`** (React 19.2) | Keep hidden tabs' state and pre-render them in the background |

---

## 💡 Limits

- **Transitions don't make slow code fast.** A single expensive component render still blocks. **Virtualise** long lists, memoise, or move heavy computation to a **Web Worker**.
- **Controlled input updates should NOT go in a transition** (the input would lag).
- **Measure INP** before and after. That's the metric this improves.

---

## 🎯 Interview answer

> "React 18 introduced concurrent rendering, often called 'Concurrent Mode' during its experimental phase, enabled through `createRoot`. It lets React prepare updates in the background, interrupt them and keep the current UI responsive. I use it per update: in a search box, the input state updates urgently while the expensive results update goes inside `startTransition`, so typing stays smooth, `isPending` dims the stale results, and if the user keeps typing React discards the outdated render. When I only receive the value as a prop, `useDeferredValue` gives the same effect; unlike a fixed debounce, it adapts to device speed, though I still debounce or cancel the network requests themselves. Concurrency also powers automatic batching, Suspense streaming, selective hydration and `useSyncExternalStore` for tear-free external stores. It's not a substitute for real optimisation: very large lists still need virtualisation, and heavy computation belongs in a Web Worker, and I measure the impact with INP."
