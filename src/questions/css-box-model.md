## Short answer

**Every element is a rectangular box made of 4 layers**, from the inside out:

```
┌─────────────────── margin ───────────────────┐   space OUTSIDE (transparent)
│  ┌──────────────── border ────────────────┐  │
│  │  ┌───────────── padding ────────────┐  │  │   space INSIDE (has the background)
│  │  │                                  │  │  │
│  │  │            content               │  │  │   text, images (width × height)
│  │  │                                  │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**`box-sizing` decides what `width` means:**

| | `content-box` (default) | `border-box` ⭐ |
|---|---|---|
| `width: 200px` means | the **content** is 200px | the **whole box** (content + padding + border) is 200px |
| Add `padding: 20px; border: 5px` | total width = 200 + 40 + 10 = **250px** 😩 | total stays **200px**, content shrinks to 150px ✅ |

**Analogy: a framed picture** 🖼️

- **Content** = the photo.
- **Padding** = the mat around the photo.
- **Border** = the frame.
- **Margin** = the space on the wall between frames.

---

## box-sizing

```css
.box {
  width: 200px;
  padding: 20px;
  border: 5px solid black;
  margin: 10px;
}
/* content-box: rendered width 250px (+20px of margin around it) */
/* border-box:  rendered width 200px */
```

**Almost every project starts with this reset:**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

**Then `width: 50%` with padding still fits in half the container**, so layouts behave intuitively.

---

## Padding vs margin

| | Padding | Margin |
|---|---|---|
| Where | inside the border | outside the border |
| Background colour | ✅ shows the element's background | ❌ transparent |
| Clickable area | ✅ part of the element | ❌ not part of it |
| Negative values | ❌ | ✅ allowed |
| `auto` | ❌ | ✅ (`margin: 0 auto` centres a block horizontally) |
| Collapses | ❌ | ⚠️ vertical margins can collapse |

**Shorthand order is clockwise from the top:** `margin: top right bottom left`

```css
margin: 10px;                /* all sides */
margin: 10px 20px;           /* top+bottom, left+right */
margin: 10px 20px 30px;      /* top, left+right, bottom */
margin: 10px 20px 30px 40px; /* top, right, bottom, left */
```

---

## Margin collapse

**Vertical margins between blocks don't add up: the larger one wins.**

```css
h2 { margin-bottom: 30px; }
p  { margin-top: 20px; }
/* gap between them = 30px, NOT 50px */
```

**It also happens between a parent and its first or last child:**

```html
<div class="card">          <!-- no padding or border -->
  <h2>Title</h2>            <!-- margin-top: 20px -->
</div>
```

The h2's margin "leaks" **outside** the card, pushing the whole card down, instead of creating space inside it.

**Margins don't collapse when:**

- **It's a horizontal margin.**
- **The parent has padding or a border**, or `display: flow-root`.
- **Elements are flex or grid items.** (A good reason to use `gap` in flex and grid.)

```css
.card { padding-top: 1px; }       /* or */
.card { display: flow-root; }     /* creates a new block formatting context → no collapse */
```

---

## DevTools tip

**In Chrome DevTools, select an element and look at the box diagram** in the Computed tab. It shows the exact content, padding, border and margin sizes, which is the fastest way to debug spacing.

---

## Quick Q&A

**Q: What is the CSS box model?**
Every element is a box of content, padding, border and margin. Its rendered size depends on these and on `box-sizing`.

**Q: `content-box` vs `border-box`?**
With content-box (the default), width and height apply to the content only, so padding and border are added on top. With border-box, width includes padding and border, which makes sizing predictable.

**Q: Padding vs margin?**
Padding is space inside the border (shows the background, part of the clickable area); margin is space outside (transparent, can be negative or auto, and vertical margins can collapse).

**Q: What is margin collapse?**
Adjacent vertical margins combine into the larger one, between siblings or between a parent and its first or last child. It doesn't happen with padding, borders, `flow-root`, or in flex and grid layouts.

---

## 🎯 Interview answer

> "Every element is rendered as a box with four layers: the content, padding inside the border, the border, and margin outside it. By default `box-sizing` is content-box, so width and height only cover the content, and padding and border are added on top, meaning a 200px box with 20px padding is actually 240px wide plus borders. That's why I apply `box-sizing: border-box` globally, so the declared width includes padding and border. Padding shows the element's background and is part of the clickable area; margin is transparent space outside, can be negative, and `auto` can centre blocks. A classic gotcha is margin collapse: adjacent vertical margins merge into the larger one, including a child's margin leaking out of a parent with no padding or border. It doesn't happen in flex or grid layouts, which is one reason I prefer `gap` there."
