## Quick answer

**React performance has two sides:**

1. **Loading performance:** how fast the app **appears**.
   - Ship less JavaScript (code splitting, tree shaking, lighter libraries).
   - Optimise images and fonts, cache well, and render on the server (SSR/SSG/streaming).
2. **Runtime performance:** how fast it **responds**.
   - Avoid unnecessary re-renders (state colocation, split contexts, selectors, memoization or the **React Compiler**).
   - Keep heavy updates non-blocking (`useTransition`, `useDeferredValue`, Web Workers).
   - Virtualise long lists.

**Always measure first** (React Profiler, Chrome Performance, Lighthouse, real-user Core Web Vitals). Then fix the biggest bottleneck, and measure again.

---

## Measure first

**Don't guess. Most "optimisations" without measurement add complexity and fix nothing.**

| Tool | What it tells you |
|---|---|
| **React DevTools → Profiler** | Which components rendered, **why** ("hook changed", "props changed"), and how long each took |
| **React DevTools → "Highlight updates when components render"** | Flashes components as they re-render. Instantly shows renders you didn't expect. |
| **Chrome DevTools → Performance** | Long tasks (> 50 ms), scripting vs layout vs paint, interaction timings. React 19.2+ adds **React "Performance Tracks"** (Scheduler and Components) to this panel. |
| **Lighthouse / PageSpeed Insights** | Lab scores, LCP, TBT, CLS, unused JavaScript, image issues |
| **`web-vitals` library + RUM** (Sentry, Datadog, Vercel Analytics) | **Real users' Core Web Vitals:** the numbers Google ranks on |
| **Bundle analyser** (`rollup-plugin-visualizer`, `vite-bundle-visualizer`, `source-map-explorer`) | What's inside your JavaScript bundles and how big each part is |

**Core Web Vitals targets** (75th percentile of real users):

| Metric | Measures | Good |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Loading: when the main content appears | ≤ 2.5 s |
| **INP** (Interaction to Next Paint) | Responsiveness: delay from click/tap/keypress to the next frame | ≤ 200 ms |
| **CLS** (Cumulative Layout Shift) | Visual stability: content jumping around | ≤ 0.1 |

```js
import { onLCP, onINP, onCLS } from 'web-vitals'
onLCP(sendToAnalytics); onINP(sendToAnalytics); onCLS(sendToAnalytics)
```

---

## Avoid unnecessary re-renders

**A component re-renders when its state changes, its parent re-renders, or a context it uses changes.** (Details: **What causes a component to re-render?**) Fix the **structure** before reaching for `memo`.

**1. Keep state local ("colocation").** State high up re-renders everything below it:

```jsx
// ❌ typing in the search box re-renders the whole page (header, charts, table…)
function Page() {
  const [query, setQuery] = useState('')
  return <><Header /><input value={query} onChange={(e) => setQuery(e.target.value)} /><HeavyDashboard /></>
}

// ✅ move the state into the component that uses it
function SearchBox() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
function Page() {
  return <><Header /><SearchBox /><HeavyDashboard /></>
}
```

**2. Pass components as `children` ("lift content up").** Children created by the parent **don't re-render** when the wrapper's state changes:

```jsx
function ScrollTracker({ children }) {
  const [y, setY] = useState(0)                       // changes on every scroll
  useEffect(() => {
    const onScroll = () => setY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div><ProgressBar value={y} />{children}</div>
}

<ScrollTracker>
  <HeavyArticle />        {/* created by the parent, so it doesn't re-render on scroll */}
</ScrollTracker>
```

**3. Split contexts, and keep their values stable.** Every consumer re-renders when the context value changes:

```jsx
// ❌ one big context: changing `theme` re-renders every component that only needs `user`
<AppContext value={{ user, theme, cart, setTheme }}>

// ✅ separate contexts per concern; state and setters separately; memoised values
const value = useMemo(() => ({ user, logout }), [user, logout])
<UserContext value={value}>
  <ThemeContext value={theme}>…</ThemeContext>
</UserContext>
```

**4. Subscribe to slices of global state with selectors:**

```jsx
const count = useCartStore((s) => s.items.length)       // Zustand: re-renders only when the count changes
const total = useSelector(selectCartTotal)              // Redux: memoised selector (createSelector)
// ❌ const { items } = useCartStore()  → re-renders on ANY store change
```

**5. Don't define components inside components.** A new component type on every render means React unmounts and remounts it (state is lost, and it's slow):

```jsx
function List() {
  const Row = ({ item }) => <li>{item.name}</li>   // ❌ a new type every render
  …
}
```

**6. Use stable, unique `key`s** (IDs, not array indexes for lists that change). Wrong keys cause re-mounts and wrong state. (See **JSX & keys**.)

**7. Derive values during render, not in effects.** An effect that sets state causes an **extra render**:

```jsx
// ❌ two renders, and an out-of-sync frame
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(`${first} ${last}`), [first, last])

// ✅ one render
const fullName = `${first} ${last}`
```

---

## Memoization & React Compiler

**Memoization skips work whose inputs didn't change:**

| Tool | Skips |
|---|---|
| `React.memo(Component)` | Re-rendering when props are shallow-equal |
| `useMemo(() => compute(a), [a])` | Re-running an expensive calculation, or keeping an object/array reference stable |
| `useCallback(fn, [deps])` | Creating a new function reference (matters when it's passed to a `memo` child or used as a dependency) |

```jsx
const ProductRow = memo(function ProductRow({ product, onSelect }) {
  return <li onClick={() => onSelect(product.id)}>{product.title}</li>
})

function ProductList({ products, filter }) {
  const visible = useMemo(() => products.filter((p) => p.title.includes(filter)), [products, filter])
  const handleSelect = useCallback((id) => console.log(id), [])   // stable, so memo works
  return <ul>{visible.map((p) => <ProductRow key={p.id} product={p} onSelect={handleSelect} />)}</ul>
}
```

**Common mistakes:**
- `memo` with an **inline object or function prop** (`style={{…}}`, `onClick={() => …}`) does nothing, because a new reference is created every render.
- Memoizing cheap things costs more than it saves. Measure first.
- **Missing dependencies** give stale values. Use the `react-hooks/exhaustive-deps` lint rule.

**The React Compiler (stable since v1.0) memoizes automatically at build time.** It removes most hand-written `memo`, `useMemo` and `useCallback`. It requires code that follows the Rules of React (pure render, no mutating props or state). (Details: **React Compiler** and **React.memo + useCallback**.)

```js
// vite.config.js (@vitejs/plugin-react v6)
// npm i -D @rolldown/plugin-babel @babel/core babel-plugin-react-compiler
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
// (an experimental, faster Rust version also exists: react({ compiler: true }) + oxc-transform-react)
```

**Next.js:** `reactCompiler: true` in `next.config`.

---

## Keep interactions responsive

**JavaScript runs on one main thread.** A long render or calculation blocks clicks and typing, which hurts **INP**. (Details: **INP & optimising it in React**.)

**1. `useTransition`:** mark a state update as **non-urgent**, so urgent updates (typing) stay instant and React can interrupt the slow render:

```jsx
const [isPending, startTransition] = useTransition()
const [tab, setTab] = useState('overview')

function selectTab(next) {
  startTransition(() => setTab(next))      // a heavy tab renders in the background; clicks stay responsive
}
// isPending → show a subtle spinner and keep the old content visible
```

**2. `useDeferredValue`:** render the expensive part with a **lagging** copy of a value:

```jsx
const [query, setQuery] = useState('')
const deferredQuery = useDeferredValue(query)

<input value={query} onChange={(e) => setQuery(e.target.value)} />    {/* updates instantly */}
<SearchResults query={deferredQuery} />                                {/* catches up when React is free */}
// wrap SearchResults in memo so it only re-renders when deferredQuery changes
```

**3. Debounce or throttle expensive work and network calls** (search requests, resize, scroll):

```jsx
const debouncedQuery = useDebounce(query, 300)          // fetch only after typing pauses
const { data } = useQuery({ queryKey: ['search', debouncedQuery], queryFn: () => search(debouncedQuery) })
```

**4. Move heavy calculations off the main thread** with a **Web Worker** (parsing big files, image processing, complex filtering):

```js
const worker = new Worker(new URL('./filter.worker.js', import.meta.url), { type: 'module' })
worker.postMessage({ rows, filter })
worker.onmessage = (e) => setResults(e.data)
```

**5. Break up long tasks:** yield to the browser between chunks (`await scheduler.yield()` where supported, or `setTimeout(0)`) so input can be handled.

**6. Keep hidden UI cheap with `<Activity>` (React 19.2+):** hide a tab or panel while **keeping its state**. React deprioritises hidden content and can pre-render a screen the user is likely to open next:

```jsx
import { Activity } from 'react'

<Activity mode={tab === 'comments' ? 'visible' : 'hidden'}>
  <Comments />      {/* state survives switching tabs; while hidden, its effects are cleaned up and re-run when shown */}
</Activity>
```

---

## Long lists & heavy DOM

**Rendering 10,000 rows means 10,000 DOM nodes:** slow renders, slow layout, high memory.

**Virtualisation renders only the visible rows** (plus a few extra). Libraries: **TanStack Virtual**, `react-window`, `react-virtuoso`. (Details: **Big lists: infinite scroll & virtualization**.)

```jsx
import { useVirtualizer } from '@tanstack/react-virtual'

function BigList({ rows }) {
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,          // row height in px
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div key={item.key} style={{ position: 'absolute', top: 0, transform: `translateY(${item.start}px)`, height: item.size, width: '100%' }}>
            {rows[item.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Alternatives and complements:**
- **Pagination** or **infinite scroll** (`useInfiniteQuery` + `IntersectionObserver`).
- CSS **`content-visibility: auto`** (with `contain-intrinsic-size`) lets the browser skip rendering off-screen sections without any JavaScript.
- Keep the DOM shallow: fewer wrapper `div`s, and render big modals or menus **only when open**.

---

## Ship less JavaScript

**Every KB of JavaScript must be downloaded, parsed and executed.** On mid-range phones, that's often the biggest cost.

**1. Code splitting with `React.lazy` + `Suspense`:** route-level first, then heavy components. (Details: **Code splitting beyond routes**.)

```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ChartEditor = lazy(() => import('./components/ChartEditor'))   // a big charting library, only when needed

<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>

// prefetch on hover/focus, so the click feels instant
const loadDashboard = () => import('./pages/Dashboard')
<Link to="/dashboard" onMouseEnter={loadDashboard} onFocus={loadDashboard}>Dashboard</Link>
```

**2. Load heavy libraries on interaction:**

```jsx
async function exportPdf() {
  const { jsPDF } = await import('jspdf')      // ~hundreds of KB, loaded only when the user clicks "Export"
  new jsPDF().text('Report', 10, 10).save('report.pdf')
}
```

**3. Tree shaking and lighter dependencies:**

| Instead of | Use |
|---|---|
| `import _ from 'lodash'` (whole library) | `import debounce from 'lodash-es/debounce'`, or native JS |
| `moment` (large, not tree-shakeable) | `date-fns`, `dayjs`, or the built-in `Intl` APIs |
| A full icon pack import | Per-icon imports (`lucide-react` named imports) or SVG sprites |
| A huge UI kit for 3 components | Headless libraries (Radix, React Aria) + your own styles |
| Polyfills for every browser | Modern build targets; polyfill only what your browserslist needs |

**4. Watch it continuously:** a bundle analyser locally, plus a **performance budget in CI** (`size-limit`, Lighthouse CI) that fails the PR when the bundle grows too much.

---

## Images, fonts & assets

**Images are usually the LCP element and the heaviest bytes.** (Details: **Optimising LCP in a React app**.)

```jsx
// the hero (LCP) image: load it first, with no lazy loading
<img
  src="/hero-1200.avif"
  srcSet="/hero-600.avif 600w, /hero-1200.avif 1200w"
  sizes="(max-width: 600px) 100vw, 1200px"
  width={1200} height={600}                // reserves space → no layout shift (CLS)
  fetchPriority="high"
  alt="Summer sale"
/>

// below-the-fold images: lazy
<img src="/product.webp" loading="lazy" decoding="async" width={300} height={300} alt="Sneaker" />
```

**Checklist:**
- **Modern formats:** AVIF/WebP, compressed, with **responsive sizes** (`srcSet`/`sizes`), served from an image CDN.
- **Always set `width` and `height`** (or CSS `aspect-ratio`) to avoid CLS.
- **Fonts:**
  - Self-host WOFF2, subset the characters, and use `font-display: swap`.
  - Preload the main font.
  - Limit the number of font weights.
- **Use SVG for icons**, and CSS instead of image files for simple shapes.
- **Video:** `preload="none"` + a poster image; lazy-load embeds (YouTube) behind a click.

**React 19 resource hints**, callable from components:

```jsx
import { preconnect, prefetchDNS, preload, preinit } from 'react-dom'

function ProductPage() {
  preconnect('https://cdn.shop.com')                                   // open the connection early
  prefetchDNS('https://analytics.example.com')
  preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  preinit('/critical-widget.js', { as: 'script' })                     // download AND execute
  return …
}
```

---

## Network, caching & data fetching

**1. Avoid request waterfalls.** Fetch in parallel, and start as early as possible:

```jsx
// ❌ sequential: the page waits for user, THEN orders, THEN recommendations
// ✅ parallel
const [user, orders] = await Promise.all([getUser(id), getOrders(id)])

// ✅ with TanStack Query: separate queries run in parallel; prefetch before navigation
queryClient.prefetchQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) })
```

Nested components that each fetch on mount create waterfalls. Fetch at the route level (router loaders, React Query prefetching, server components).

**2. Cache server data** with TanStack Query, RTK Query or SWR: deduplicated requests, `staleTime` per data type, background refetching, instant back navigation. (See **Cache invalidation & optimistic updates**.)

**3. HTTP caching and delivery:**
- **Hashed assets** (`app.3f9a1c.js`): `Cache-Control: public, max-age=31536000, immutable`.
- **`index.html`:** `no-cache`, so new deployments are picked up.
- **Brotli/gzip compression**, **HTTP/2 or HTTP/3**, and a **CDN** close to users.
- **Request less data:** pagination, field selection (GraphQL or BFF endpoints), and compressed API responses.

**4. Render on the server when it matters** (public, SEO-relevant pages):
- **SSR/SSG/ISR** and **streaming with Suspense** show content before the JavaScript loads.
- **React Server Components** keep server-only code out of the bundle.
- **Selective hydration** makes visible parts interactive first.

(Details: **CSR vs SSR vs SSG vs ISR** and **Next.js rendering strategies**.)

---

## Browser rendering & memory

**DOM, layout and paint:** (Details: **Reflow, repaint & animation performance**)
- **Animate `transform` and `opacity` only.** They run on the compositor; animating `top`, `width` or `height` triggers layout on every frame.
- **Avoid layout thrashing:** don't alternate DOM reads (`offsetHeight`) and writes in loops. Batch reads, then writes.
- Use **passive** scroll and touch listeners, and **`requestAnimationFrame`** for visual updates.
- **CSS containment** (`contain: layout paint`) limits how much of the page a change affects.

**Memory:** clean up in `useEffect`. Clear timers, remove listeners (or use `AbortController`), cancel requests, unsubscribe from sockets and stores, and avoid unbounded caches. Leaks make long-running apps slower over time. (Details: **Finding & fixing memory leaks in a long-running SPA**.)

**Production build hygiene:**
- Deploy the **production build** (development React is much slower).
- Strip `console.log` statements and dev-only tools.
- Upload source maps to your error tracker instead of serving them publicly.

---

## Optimization checklist

| Area | Technique | Improves |
|---|---|---|
| Measure | Profiler, Performance panel, Lighthouse, RUM Core Web Vitals, budgets in CI | Everything (finds the real problem) |
| Re-renders | State colocation, children as props, split contexts, selectors, stable keys, no components inside components | Runtime, INP |
| Memoization | React Compiler, or targeted `memo` / `useMemo` / `useCallback` | Runtime |
| Responsiveness | `useTransition`, `useDeferredValue`, debounce, Web Workers, yielding, `<Activity>` | INP |
| Lists | Virtualisation, pagination, `content-visibility` | Runtime, memory |
| JavaScript size | Route and component code splitting, prefetching, dynamic imports, tree shaking, lighter libraries | LCP, TBT, INP |
| Assets | AVIF/WebP, responsive images, `fetchPriority`, lazy loading, dimensions, font strategy, resource hints | LCP, CLS |
| Data | Parallel fetching, query caching, prefetching, smaller payloads | LCP, perceived speed |
| Delivery | CDN, Brotli, HTTP/2/3, immutable caching of hashed assets | LCP |
| Rendering strategy | SSR/SSG/streaming, server components, selective hydration | LCP, SEO |
| Browser | `transform`/`opacity` animations, no layout thrashing, passive listeners | Smoothness, INP |
| Memory | Effect cleanup, `AbortController`, bounded caches | Long sessions |

---

## Interview Q&A

**Q: How do you find a performance problem in a React app?**
Reproduce it, then measure: React Profiler for which components render and why, the Chrome Performance panel for long tasks, Lighthouse for loading, and real-user Core Web Vitals to prioritise. Fix the biggest cause, then measure again.

**Q: When should you use `React.memo`?**
When a component re-renders often with the same props and its render is expensive, and only when its props are stable (memoised callbacks and objects). With the React Compiler, it's mostly automatic.

**Q: `useMemo` vs `useCallback`?**
`useMemo` caches a computed value; `useCallback` caches a function reference. `useCallback(fn, deps)` equals `useMemo(() => fn, deps)`.

**Q: How do you keep typing responsive while filtering a big list?**
Keep the input state urgent, and render the list with `useDeferredValue` or `startTransition`, memoise the list, virtualise it, and move very heavy filtering to a Web Worker.

**Q: How do you reduce bundle size?**
Analyse the bundle, split code by route and by heavy component with `lazy`, load big libraries on interaction, tree-shake with ES module imports, replace heavy dependencies, and enforce a size budget in CI.

**Q: What causes a slow LCP in a React SPA?**
A big JavaScript bundle that must run before anything renders, a hero image that's discovered late or lazy-loaded, render-blocking fonts or CSS, and data waterfalls. Fix it with SSR/SSG or a smaller critical bundle, a prioritised hero image, preloads and parallel data fetching.

---

## 🎯 Interview answer

> "I split React performance into loading and runtime, and always start by measuring with the React Profiler, the Chrome Performance panel, Lighthouse and real-user Core Web Vitals, LCP, INP and CLS, so I fix real bottlenecks. For runtime, I first fix the structure to avoid unnecessary re-renders: colocate state, pass heavy subtrees as children, split contexts and keep their values stable, subscribe to store slices with selectors, use stable keys, never define components inside components, and derive values during render instead of syncing them with effects. Then I memoise: the React Compiler now does most of it automatically, otherwise targeted `memo`, `useMemo` and `useCallback` with stable props. For responsiveness I use `useTransition` and `useDeferredValue` for heavy updates, debounce network calls, move heavy computation to Web Workers, virtualise long lists, and use `Activity` to keep hidden tabs cheap. For loading, I ship less JavaScript with route- and component-level code splitting and prefetching on hover, dynamic imports for heavy libraries, tree shaking and lighter dependencies, all enforced with a bundle budget in CI. I serve modern responsive images with explicit dimensions and a high-priority hero image, and self-hosted fonts with preloads; I fetch data in parallel and cache it with TanStack Query; I use immutable caching of hashed assets behind a CDN with Brotli; and I choose SSR, streaming or static generation where first paint and SEO matter. Finally, I clean up effects to avoid memory leaks and animate only transform and opacity."
