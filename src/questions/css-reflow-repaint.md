## Short answer

**To show a page, the browser goes through a pipeline:**

```
HTML → DOM ─┐
            ├─▶ Style → Layout (reflow) → Paint (repaint) → Composite → 🖥️
CSS → CSSOM ┘
```

| Step | What happens | Triggered by changing |
|---|---|---|
| **Layout (reflow)** | Calculate **size and position** of elements | `width`, `height`, `margin`, `padding`, `top`, `left`, font size, adding or removing elements |
| **Paint (repaint)** | Fill in **pixels**: colours, text, shadows | `color`, `background`, `box-shadow`, `visibility` |
| **Composite** | Combine painted **layers**, often on the GPU | **`transform`**, **`opacity`** ⭐ |

**Cost: reflow > repaint > composite.** For smooth 60fps animations, **animate only `transform` and `opacity`.**

**Analogy: rearranging a room** 🛋️

- **Reflow** = moving the furniture: you must re-measure where **everything** goes.
- **Repaint** = repainting a wall: nothing moves, but it takes work.
- **Composite** = sliding a picture on a hook: quick and easy.

---

## Animate the right properties

```css
/* ❌ animating left/top → reflow on EVERY frame → janky */
.box { position: relative; transition: left 0.3s; }
.box:hover { left: 100px; }

/* ✅ animating transform → compositor only → smooth */
.box { transition: transform 0.3s; }
.box:hover { transform: translateX(100px); }
```

| Instead of animating... | Animate |
|---|---|
| `left`, `top`, `margin` | `transform: translate()` |
| `width`, `height` | `transform: scale()` |
| `visibility` / `display` (fade) | `opacity` |

**`will-change: transform`** hints that an element will animate, so the browser can promote it to its own layer in advance. **Use it sparingly**, because every layer uses GPU memory.

---

## Transitions vs animations

```css
/* transition: animate between two states when something changes */
.button {
  background: #2563eb;
  transition: background 0.2s ease, transform 0.2s ease;
}
.button:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}

/* animation: keyframes, can loop and run without a trigger */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.spinner { animation: spin 1s linear infinite; }

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.toast { animation: fade-in 0.3s ease-out; }
```

| | **Transition** | **Animation** (`@keyframes`) |
|---|---|---|
| Needs a trigger | ✅ (hover, a class change) | ❌ can start on its own |
| States | start → end | many keyframes |
| Loops | ❌ | ✅ (`infinite`) |
| Best for | hover effects, toggles | spinners, attention effects, entrance animations |

**Respect users who get motion sickness:**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Layout thrashing

**Reading layout values (like `offsetHeight`) right after changing styles forces the browser to recalculate the layout immediately.** Doing it in a loop is very slow:

```js
// ❌ read → write → read → write: forces a reflow on every iteration
boxes.forEach((box) => {
  const height = box.offsetHeight            // READ (forces layout)
  box.style.height = height * 2 + 'px'       // WRITE (invalidates layout)
})

// ✅ batch: all reads first, then all writes → one reflow
const heights = boxes.map((box) => box.offsetHeight)
boxes.forEach((box, i) => { box.style.height = heights[i] * 2 + 'px' })
```

**Properties that force layout when read:** `offsetWidth/Height/Top`, `clientWidth`, `scrollTop`, `getBoundingClientRect()`, `getComputedStyle()`.

**Other tips:**

- **Change a class instead of many inline styles.**
- **Use `requestAnimationFrame`** for JS animations.
- **Use `DocumentFragment`** or a single `innerHTML` when adding many elements.

---

## Core Web Vitals link

- **CLS (Cumulative Layout Shift):** content jumping around. Fix it with image `width`/`height`, reserved space for ads and embeds, and font loading strategies.
- **INP (Interaction to Next Paint):** slow responses to clicks, often heavy JS or layout work. Keep the main thread free.
- **LCP (Largest Contentful Paint):** how quickly the main content appears. Optimise images, critical CSS and fonts.

**`content-visibility: auto`** skips rendering off-screen sections until they're needed, which speeds up long pages.

---

## Quick Q&A

**Q: Reflow vs repaint?**
Reflow (layout) recalculates element sizes and positions, triggered by geometry changes, and is the most expensive. Repaint redraws pixels for visual changes like colour, without changing layout.

**Q: Which CSS properties are cheapest to animate?**
`transform` and `opacity`. They can be handled by the compositor without layout or paint.

**Q: What is layout thrashing?**
Alternating DOM reads and writes in a loop, forcing a synchronous reflow on each read. Batch reads, then writes.

**Q: Transition vs animation?**
Transitions animate between two states when a property changes; keyframe animations define multiple steps and can run automatically or loop.

**Q: What does `will-change` do?**
Hints that a property will change, so the browser can prepare (e.g. create a layer). Overuse wastes memory.

---

## 🎯 Interview answer

> "The browser builds the DOM and CSSOM, computes styles, then runs layout, which calculates every element's size and position, then paint, which fills in pixels, and finally compositing, which combines layers, often on the GPU. Changing geometry like width, margins or top triggers a reflow, the most expensive step, and it can cascade to other elements; changing colours or shadows only triggers repaint; and transform and opacity can be handled purely by the compositor. So for smooth 60fps animations I animate transform and opacity instead of left, top or width, use `will-change` sparingly, and respect `prefers-reduced-motion`. In JavaScript I avoid layout thrashing, interleaving reads like `offsetHeight` with style writes, by batching reads before writes and using `requestAnimationFrame`. This ties into Core Web Vitals: avoiding layout shifts for CLS and keeping the main thread free for INP."
