## Short answer

**Responsive design means one website that adapts to every screen size**, from phones to large monitors.

**The main tools:**

1. **The viewport meta tag**, so phones don't zoom out.
2. **Fluid layouts:** `%`, `fr`, flex and grid instead of fixed pixel widths.
3. **Relative units:** `rem`, `em`, `vw`, `vh`, `%`.
4. **Media queries** to change the layout at breakpoints.
5. **Responsive images** (`srcset`, `max-width: 100%`).
6. **Mobile-first:** start with the phone layout, then add styles for bigger screens.

**Analogy: water** 💧 Pour it into a glass, a bottle or a bowl, and it takes the shape of the container. A responsive layout does the same with screens.

---

## CSS units

| Unit | Relative to | Use for |
|---|---|---|
| `px` | fixed pixels | borders, shadows, small details |
| **`rem`** | the **root** (`html`) font size, usually 16px | ⭐ **font sizes, spacing**: respects the user's browser font setting |
| `em` | the **current element's** font size | padding that scales with that element's text (buttons) |
| `%` | the parent's size | widths |
| `vw` / `vh` | 1% of the viewport width / height | full-screen sections, fluid type |
| `dvh` / `svh` / `lvh` | the **dynamic** viewport height on mobile | full-height sections that don't jump when mobile browser bars appear |
| `fr` | a fraction of free space (grid) | grid columns |
| `ch` | the width of the "0" character | readable line length: `max-width: 65ch` |

### rem vs em ⭐

```css
html { font-size: 16px; }              /* 1rem = 16px everywhere */

.card { font-size: 1.25rem; }          /* 20px */
.card p { font-size: 0.875rem; }       /* 14px: rem ignores the parent, so it's predictable */

.btn { font-size: 18px; padding: 0.5em 1em; }   /* em = 18px → padding 9px 18px, scales with the button's text */
```

**`em` compounds when nested:** a `1.2em` list inside a `1.2em` list is 1.44 times bigger. That's why `rem` is preferred for font sizes.

**Why not `px` for fonts?** If a user sets a bigger default font in the browser (for accessibility), `rem`-based text grows with it, but `px` text doesn't.

---

## Media queries

```css
/* mobile-first: base styles are for phones */
.grid { display: grid; grid-template-columns: 1fr; gap: 16px; }

@media (min-width: 640px) {            /* tablets and up */
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {           /* laptops and up */
  .grid { grid-template-columns: repeat(4, 1fr); }
}
```

**Mobile-first (`min-width`) vs desktop-first (`max-width`):** mobile-first is usually cleaner. Phones get the simplest CSS, and you **add** complexity as space grows.

**Other useful media features:**

```css
@media (prefers-color-scheme: dark) { ... }       /* dark mode */
@media (prefers-reduced-motion: reduce) { ... }   /* fewer animations */
@media (hover: hover) { .card:hover { ... } }      /* only on devices that can hover */
@media (orientation: landscape) { ... }
@media print { .no-print { display: none; } }
```

---

## Modern responsive CSS

### Fluid sizes with `clamp()`, no breakpoints needed

```css
h1 {
  font-size: clamp(1.75rem, 4vw + 1rem, 3.5rem);   /* min, preferred, max */
}

.container {
  width: min(100% - 2rem, 1200px);     /* full width with a gutter, capped at 1200px */
  margin-inline: auto;
}
```

### Container queries: respond to the **component's** size, not the screen's

```css
.card-wrapper { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: flex; }             /* side-by-side layout when the CARD has room */
}
```

**The same card can stack in a narrow sidebar and sit side by side in a wide main area**, which media queries can't do.

---

## Responsive images

```html
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
  sizes="(min-width: 1024px) 50vw, 100vw"
  alt="Mountain lake at sunrise"
  loading="lazy"
  width="800" height="533"
/>
```

```css
img { max-width: 100%; height: auto; }   /* never overflow the container */
```

- **`srcset` + `sizes`:** the browser downloads the right size for the screen, so phones don't download a 4K image.
- **`width` + `height` attributes:** reserve space and prevent layout shift (CLS).
- **`loading="lazy"`:** only load images when they're near the viewport.

---

## The viewport tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

**Without it, phones render the page at about 980px wide and shrink it**, so media queries and readable text don't work.

---

## Quick Q&A

**Q: `rem` vs `em`?**
`rem` is relative to the root font size (predictable everywhere); `em` is relative to the current element's font size (compounds when nested). Use `rem` for font sizes and spacing, and `em` for things that should scale with the local text.

**Q: What is mobile-first?**
Writing base CSS for small screens and adding `min-width` media queries for larger ones.

**Q: Media queries vs container queries?**
Media queries respond to the viewport size; container queries respond to the size of a parent container, so components adapt to wherever they're placed.

**Q: Why the viewport meta tag?**
It tells mobile browsers to use the device width instead of a zoomed-out ~980px layout.

**Q: `vh` problems on mobile?**
`100vh` can be taller than the visible area when browser toolbars show. Use `100dvh` (dynamic viewport height).

---

## 🎯 Interview answer

> "Responsive design means one layout that adapts to any screen. It starts with the viewport meta tag so mobile browsers use the device width, then fluid layouts with flexbox, grid, percentages and fr units instead of fixed widths. I use rem for font sizes and spacing, because it respects the user's browser font size and doesn't compound like em; em for padding that should scale with an element's own text; and vw, vh or dvh for viewport-based sizing. I write mobile-first CSS and add min-width media queries at breakpoints, and use modern tools like `clamp()` for fluid typography, `min()` for capped containers, and container queries so components adapt to their container rather than the screen. Images get `max-width: 100%`, srcset and sizes for the right resolution, width and height to avoid layout shift, and lazy loading."
