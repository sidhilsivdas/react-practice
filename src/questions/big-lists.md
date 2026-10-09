## Short answer

**The problem:** rendering **10,000 items** creates **10,000 DOM elements**. The page loads slowly, scrolling lags, and memory use is high.

**3 solutions:**

| Technique | Idea | Analogy |
|---|---|---|
| **Pagination** | Show 20 items per page, with Next and Prev buttons | Book pages 📖 |
| **Infinite scroll** | **Load 20 more** when the user reaches the bottom | Instagram feed 📱 |
| **Virtualization** | Only render the items **visible on screen** (~15), however long the list is | A **train window** 🚆: you only see a few trees at a time, but the forest is huge |

---

## Listing from memory

```jsx
// 10,000 items in memory
const ITEMS = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }))

function SimpleList() {
  return (
    <ul>
      {ITEMS.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

❌ **10,000 `<li>` elements**, so it's slow. That's fine for 100 items, but a problem for thousands.

### Bonus: searching a list in memory

```jsx
function SearchList() {
  const [query, setQuery] = useState('')

  // recalculate only when query changes, not on every render
  const filtered = useMemo(
    () => ITEMS.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <p>{filtered.length} results</p>
      <ul>
        {filtered.slice(0, 50).map((item) => (   // show only the first 50
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </>
  )
}
```

---

## Infinite scroll

**Idea:** show 20 items. Put an invisible **"sentinel"** element at the bottom. When it **appears on screen**, show 20 more.

**Tool:** **`IntersectionObserver`**, a browser API that tells you when an element becomes visible. It's better than listening to `scroll`, which fires hundreds of times.

### From memory (simplest)

```jsx
import { useEffect, useRef, useState } from 'react'

const ITEMS = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }))

function InfiniteList() {
  const [count, setCount] = useState(20)
  const loaderRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setCount((c) => Math.min(c + 20, ITEMS.length))   // show 20 more
      }
    })

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()                    // cleanup
  }, [count])

  return (
    <ul>
      {ITEMS.slice(0, count).map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}

      {count < ITEMS.length && <li ref={loaderRef}>Loading more...</li>}
    </ul>
  )
}
```

**Step by step:**

1. **The first render shows 20 items**, plus the "Loading more..." sentinel.
2. **The user scrolls down and the sentinel becomes visible**, so the observer fires.
3. **`setCount` raises the count to 40**, the component re-renders, and 40 items show.
4. **The sentinel moves down again.** This repeats until all items are shown.
5. **At the end, the sentinel is removed**, so nothing more loads.

**Why `[count]` in the dependencies?** If the screen is tall and the sentinel is **still visible** after adding 20 items, the observer won't fire again, because nothing "changed". Re-creating the observer each time makes it check again.

---

## Infinite scroll with API

```jsx
function InfiniteUsers() {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef(null)

  // 1. Fetch whenever the page changes
  useEffect(() => {
    let ignore = false
    setLoading(true)

    fetch(`/api/users?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return                       // ⚠️ StrictMode runs effects twice
        setUsers((prev) => [...prev, ...data])   // ⭐ append, don't replace
        setHasMore(data.length === 20)           // fewer than 20 → no more pages
      })
      .finally(() => setLoading(false))

    return () => { ignore = true }
  }, [page])

  // 2. Next page when the sentinel is visible
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && hasMore) {
        setPage((p) => p + 1)
      }
    })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loading, hasMore])

  return (
    <ul>
      {users.map((u) => <li key={u.id}>{u.name}</li>)}
      {hasMore && <li ref={loaderRef}>{loading ? 'Loading...' : ''}</li>}
      {!hasMore && <li>No more users</li>}
    </ul>
  )
}
```

| Code | Why |
|---|---|
| `[...prev, ...data]` | **Append** the new page to the list, don't replace it |
| `!loading` check | Don't request page 3 while page 2 is still loading |
| `hasMore` | Stop when the server has no more data |
| `ignore` flag | StrictMode runs the effect twice, which would add page 1 **twice** |
| `observer.disconnect()` | Cleanup, so there's no leak |

---

## Virtualization

**Idea:** the list **looks** like 10,000 rows (correct scrollbar), but only **~15 rows actually exist** in the DOM: the ones on screen. When you scroll, the same few rows are **re-used** to show different items.

```
┌─────────────────────────┐ ← outer box: height 400px, overflow: auto (scrollable)
│ ┌─────────────────────┐ │
│ │  empty space        │ │ ← inner box: height = 10,000 × 40px = 400,000px
│ │  (rows 0–94 NOT     │ │   (gives the correct scrollbar)
│ │   rendered)         │ │
│ ├─────────────────────┤ │
│ │ Item 95  ←─┐        │ │
│ │ Item 96    │ only   │ │ ← only these rows exist in the DOM,
│ │ ...        │ ~20    │ │   placed with position: absolute; top: index × 40px
│ │ Item 114 ←─┘ rows   │ │
│ ├─────────────────────┤ │
│ │  empty space        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### From scratch (fixed row height)

```jsx
import { useState } from 'react'

const ITEMS = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }))
const ROW_HEIGHT = 40      // every row is 40px
const BOX_HEIGHT = 400     // visible area
const OVERSCAN = 5         // extra rows above/below for smooth scrolling

function VirtualList() {
  const [scrollTop, setScrollTop] = useState(0)

  // which rows are visible?
  const firstVisible = Math.floor(scrollTop / ROW_HEIGHT)
  const visibleCount = Math.ceil(BOX_HEIGHT / ROW_HEIGHT)

  const start = Math.max(0, firstVisible - OVERSCAN)
  const end = Math.min(ITEMS.length, firstVisible + visibleCount + OVERSCAN)

  return (
    <div
      style={{ height: BOX_HEIGHT, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* full height → real scrollbar */}
      <div style={{ height: ITEMS.length * ROW_HEIGHT, position: 'relative' }}>
        {ITEMS.slice(start, end).map((item, i) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: (start + i) * ROW_HEIGHT,   // put it at its real position
              height: ROW_HEIGHT,
              width: '100%',
            }}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**The maths, with an example:**

```
User scrolled 4000px:
  firstVisible = floor(4000 / 40) = 100
  visibleCount = ceil(400 / 40)   = 10
  start = 100 - 5 = 95
  end   = 100 + 10 + 5 = 115
→ render only items 95–114 (20 rows), each at top = index × 40px
```

**Only 20 DOM rows instead of 10,000.** The scrollbar is correct because the inner box is 400,000px tall.

---

## Virtualization library

**What you'd use in real projects:**

```jsx
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList() {
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: ITEMS.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,     // row height
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              height: row.size,
              transform: `translateY(${row.start}px)`,
            }}
          >
            {ITEMS[row.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**It's the same idea as the from-scratch version**, but the library also handles **different row heights**, horizontal lists, grids and scrolling to an item. **`react-window`** is another popular option.

---

## Comparison

| | Pagination | Infinite scroll | Virtualization |
|---|---|---|---|
| Items in the DOM | 20 | **keeps growing** (20, 40, 60...) | **always ~20** |
| Data loaded | one page | page by page | can be all at once |
| Best for | tables, search results, admin panels | social feeds, product lists | **huge lists** (10k+ rows), chat, logs |
| Jump to page 50? | ✅ easy | ❌ hard | ✅ scroll there |
| Footer reachable? | ✅ | ❌ keeps loading | ✅ |
| Ctrl+F finds items? | only the current page | only the loaded ones | ❌ only visible rows |

**⭐ Real apps combine them:** infinite scroll **+** virtualization (Twitter/X, Slack). Data loads page by page, and the DOM stays small.

---

## Quick Q&A

**Q: Why is rendering 10,000 items slow?**
Each item becomes a DOM element. Creating, laying out and painting thousands of elements is slow and uses a lot of memory.

**Q: How do you detect "reached the bottom"?**
**`IntersectionObserver`** on a sentinel element at the end of the list. It's better than a `scroll` listener because the browser tells you when it's visible, with no constant calculations.

**Q: What is virtualization (windowing)?**
Rendering only the rows visible in the scroll area (plus a few extra), positioned absolutely inside a full-height container, so the scrollbar looks right.

**Q: What is overscan?**
A few extra rows rendered above and below the visible area, so fast scrolling doesn't show blank gaps.

**Q: Problem with infinite scroll alone?**
The DOM keeps growing. After scrolling a lot, the page slows down again, so combine it with virtualization.

**Q: Virtualization downsides?**
Ctrl+F only finds visible rows, variable row heights are harder (each row must be measured), accessibility needs care, and it's more complex than a plain list.

**Q: Bug: page 1 shows twice in infinite scroll?**
StrictMode runs effects twice in development. Use an `ignore` flag or `AbortController` in the cleanup.

---

## 🎯 Interview answer

> "Rendering a large list directly creates thousands of DOM nodes, which makes loading and scrolling slow. There are three common solutions. Pagination shows one page at a time. Infinite scroll loads more items when the user reaches the bottom: I put a sentinel element at the end of the list and use an `IntersectionObserver` to load the next page when it becomes visible, appending the results, with checks for `loading` and `hasMore` so I don't make duplicate requests. Virtualization, or windowing, renders only the visible rows: an outer scrollable container, an inner container with the full height so the scrollbar is right, and I calculate the start and end index from `scrollTop` divided by the row height, render only that slice plus some overscan, and position each row absolutely at `index × rowHeight`. So 10,000 items need only about 20 DOM nodes. In real projects I'd use `@tanstack/react-virtual` or `react-window`, and for feeds I'd combine infinite scroll with virtualization so both the data and the DOM stay small."
