## Short answer

| `position` | Moves with `top/left/...`? | Positioned relative to | Leaves its space in the layout? | Scrolls with the page? |
|---|---|---|---|---|
| **`static`** (default) | ❌ | normal flow | ✅ | ✅ |
| **`relative`** | ✅ | **its own normal position** | ✅ (the space stays) | ✅ |
| **`absolute`** | ✅ | the **nearest positioned ancestor** | ❌ removed from flow | ✅ (with that ancestor) |
| **`fixed`** | ✅ | the **viewport** (browser window) | ❌ removed | ❌ stays on screen |
| **`sticky`** | ✅ | normal, until a scroll threshold, then "sticks" | ✅ | sticks inside its parent |

**Analogy: people in a cinema** 🎬

- **static** = sitting in your assigned seat.
- **relative** = leaning a bit from your seat; the seat is still yours.
- **absolute** = standing up and positioning yourself relative to a reference point, such as the row (the positioned ancestor). Your seat is given away.
- **fixed** = a sign on the screen: always in the same place, whatever happens.
- **sticky** = you walk with the crowd until you reach the front, then stay there.

---

## relative & absolute

**The classic combo:** `position: relative` on the parent creates a **reference box**, and `position: absolute` on the child positions it inside that box.

```html
<div class="card">
  <img src="shoe.jpg" alt="Running shoe" />
  <span class="badge">SALE</span>
</div>
```

```css
.card {
  position: relative;        /* the reference box for the badge */
}

.badge {
  position: absolute;        /* removed from flow, positioned inside .card */
  top: 8px;
  right: 8px;
}
```

**⚠️ No positioned ancestor?** The absolute element positions itself relative to the **page** (the initial containing block). That's the classic "my badge flew to the corner of the screen" bug.

**"Positioned" means `position` is anything except `static`.**

### relative alone

```css
.nudge { position: relative; top: 4px; }   /* moves 4px down, but the original space stays empty */
```

---

## fixed & sticky

```css
/* stays in the corner while scrolling */
.chat-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
}

/* scrolls normally, then sticks at the top of the viewport */
.table-header {
  position: sticky;
  top: 0;                     /* ⚠️ required: the threshold where it sticks */
  background: white;
}
```

**Sticky not working? Check:**

1. **You set `top`** (or `bottom`/`left`/`right`).
2. **No ancestor has `overflow: hidden`, `auto` or `scroll`.** Sticky sticks within the nearest scrolling ancestor.
3. **The parent is taller than the sticky element.** It only sticks while its parent is on screen.

**`fixed` gotcha:** if an ancestor has `transform`, `filter` or `perspective`, `fixed` becomes relative to **that ancestor** instead of the viewport.

---

## z-index & stacking

**`z-index` controls which element is on top**, but only for **positioned** elements (or flex and grid items).

```css
.modal    { position: fixed; z-index: 1000; }
.dropdown { position: absolute; z-index: 10; }
```

### Stacking contexts ⭐ ("why doesn't z-index: 9999 work?")

**A stacking context is a group whose children are layered only inside it.** A child can **never** go above something outside its parent's stacking context, whatever its z-index.

```html
<div class="header" style="position: relative; z-index: 1">
  <div class="menu" style="position: absolute; z-index: 9999">Menu</div>   <!-- stuck at level 1 -->
</div>
<div class="content" style="position: relative; z-index: 2">...</div>      <!-- covers the menu! -->
```

**What creates a new stacking context:**

- **`position` (relative or absolute) + a `z-index` that isn't `auto`**, and `position: fixed` or `sticky`.
- **`opacity` below 1.**
- **`transform`, `filter`, `perspective`.**
- **`isolation: isolate`** (does it on purpose).
- **A flex or grid item with a `z-index`.**

**Fix:** raise the z-index of the **parent's** stacking context, or move the modal or menu outside (React **portals** render modals into `document.body` for exactly this reason).

---

## inset shorthand

```css
.overlay {
  position: absolute;
  inset: 0;                 /* = top: 0; right: 0; bottom: 0; left: 0 → covers the whole parent */
}
```

---

## Quick Q&A

**Q: relative vs absolute?**
`relative` offsets an element from its normal position while keeping its space in the layout. `absolute` removes it from the flow and positions it relative to the nearest positioned ancestor.

**Q: absolute vs fixed?**
Absolute is relative to the nearest positioned ancestor and scrolls with it; fixed is relative to the viewport and stays in place when scrolling (unless an ancestor has a transform).

**Q: How does sticky work?**
It behaves like relative until the element reaches the threshold (like `top: 0`) while scrolling, then sticks like fixed, but only within its parent and nearest scroll container.

**Q: Why doesn't my z-index work?**
Either the element isn't positioned, or it's inside a stacking context (created by z-index, opacity, transform and others) that sits below the element it should cover.

**Q: How do you make an overlay cover its parent?**
`position: relative` on the parent; `position: absolute; inset: 0` on the overlay.

---

## 🎯 Interview answer

> "`position` has five values. static is the default normal flow. relative keeps the element's space in the layout but lets you offset it, and it also makes the element a reference point for absolutely positioned children. absolute removes the element from the flow and positions it relative to the nearest positioned ancestor, or the page if there isn't one, which is the usual bug when a badge flies off. fixed positions relative to the viewport and stays put while scrolling, unless an ancestor has a transform. sticky acts like relative until a scroll threshold like `top: 0`, then sticks within its parent, and it fails if `top` is missing or an ancestor has overflow hidden. z-index only applies to positioned or flex and grid items, and works within stacking contexts created by things like z-index, opacity below 1 and transforms. A child can't escape its parent's context, which is why modals are often rendered through portals at the body level."
