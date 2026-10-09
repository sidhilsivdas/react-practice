## 📄 Original answer (PDF)

**Question:** Discuss your strategy for implementing Code Splitting beyond just route-based splitting.

**Answer:** While `React.lazy()` for routes is standard, I use component-level splitting for heavy modules not immediately visible (modals, below-the-fold complex charts). I also split vendor libraries using Webpack/Vite chunking strategies.

**Real-time example:** An analytics dashboard where the 500KB Chart.js library is dynamically imported only when the user clicks 'Show Graph', drastically reducing the initial JS payload.

---

## 💡 Splitting levels

| Level | How | Example |
|---|---|---|
| **Route** | `lazy(() => import('./pages/Reports'))` | Each page in its own chunk |
| **Component** (below the fold, modals, tabs) | `lazy` + `<Suspense>`; `next/dynamic` | Charts, rich-text editor, image zoom, map |
| **On interaction** | `import()` inside an event handler | Load an export-to-PDF library when "Export" is clicked |
| **On visibility** | `IntersectionObserver` triggers the import | Load reviews or a carousel when scrolled near |
| **Library-level** | Import only what you use | `import debounce from 'lodash/debounce'`; date-fns instead of moment |
| **Vendor chunking** | Bundler config | A stable `react` chunk that's long-cached and rarely changes |
| **Server components** | No client JS at all | Static product details rendered on the server |

---

## 💡 Patterns in code

```tsx
// 1. component-level: below-the-fold chart
const SalesChart = lazy(() => import('./SalesChart'))

<Suspense fallback={<ChartSkeleton />}>          {/* skeleton with the same size → no CLS */}
  {showGraph && <SalesChart data={data} />}
</Suspense>
```

```tsx
// 2. on interaction + prefetch on hover (feels instant)
const loadExporter = () => import('./pdfExporter')

<button
  onMouseEnter={loadExporter}                    // start downloading early
  onFocus={loadExporter}
  onClick={async () => {
    const { exportToPdf } = await loadExporter() // cached after the first import()
    exportToPdf(report)
  }}
>
  Export PDF
</button>
```

```tsx
// 3. Next.js: client-only heavy widget
'use client'
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('./StoreMap'), { ssr: false, loading: () => <MapSkeleton /> })
```

```js
// 4. Vite vendor chunking (Rollup / Rolldown output options)
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'], charts: ['chart.js'] },
      },
    },
  },
})
```

---

## 💡 Splitting pitfalls

| Pitfall | Why | Fix |
|---|---|---|
| **Over-splitting** | Dozens of tiny chunks add request overhead | Split meaningful, heavy pieces (> ~30 KB) |
| **Splitting the LCP or above-the-fold UI** | Delays the main content (worse LCP) | Keep critical UI in the main bundle or server-rendered |
| **Spinners everywhere** | Layout shift + a "popcorn" UI | Skeletons sized like the content; group related parts under one Suspense boundary |
| **No prefetch** | Click → wait for download | Prefetch on hover, focus, idle or visibility |
| **Barrel files** (`index.ts` re-exporting everything) | Can defeat tree shaking and pull whole libraries in | Direct imports; `sideEffects: false` in packages |
| **Chunk load failure after deploy** | Old HTML requests a deleted chunk | Retry the import, or reload on `ChunkLoadError`; keep old assets around briefly |

---

## 💡 Measuring

- **Bundle analysers:** `rollup-plugin-visualizer` (Vite), `@next/bundle-analyzer`, `source-map-explorer`.
- **Coverage tab in DevTools:** how much of the downloaded JS is unused on load.
- **Budgets in CI:** `size-limit` for each entry and route.
- **Real-user INP and LCP** before and after.

---

## 🎯 Interview answer

> "Route-level splitting is the baseline, but I also split at the component level for heavy things not needed immediately, like modals, editors, maps and below-the-fold charts, using `React.lazy` with Suspense or `next/dynamic`, and at the interaction level by calling `import()` in the event handler, prefetching on hover or focus so it still feels instant. Visibility-based loading with IntersectionObserver works for content further down the page. At the library level I import only what's used and avoid barrel files that defeat tree shaking, and I configure vendor chunking so stable libraries like React get long-term cached chunks. With server components, static parts ship no client JavaScript at all. I avoid over-splitting and never split the LCP or above-the-fold UI, use content-sized skeletons to prevent layout shift, handle chunk-load failures after deploys, and verify the impact with a bundle analyser, the Coverage tab, size budgets in CI and real-user LCP and INP."
