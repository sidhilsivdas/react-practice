## Problem

The card's text is too long. Using only CSS:

1. **`.title`** must stay on **one line**, and be cut off with **"…"** at the end.
2. **`.description`** must show **at most two lines**, and be cut off with **"…"**.

**Don't shorten the text in the HTML**, and don't make the font smaller. The browser should do the cutting.

## Examples

```
┌──────────────────────────────┐
│ The complete guide to bui…   │   ← title: 1 line + "…"
│ Learn flexbox and grid lay-  │
│ outs, responsive design, a…  │   ← description: 2 lines + "…"
└──────────────────────────────┘
```

**Real use:** product names in shopping cards, email subjects in an inbox, file names, notification previews.

## Hints

1. **Single line:** stop the text wrapping, hide what overflows, then ask for an ellipsis. It takes **3 properties**.
2. **Multiple lines:** look up `-webkit-line-clamp`. It needs a couple of companion properties to work.

<!-- SOLUTION -->

## Single-line ellipsis

**Three properties, and you need all three:**

```css
.title {
  white-space: nowrap;        /* 1. keep it on one line */
  overflow: hidden;           /* 2. hide the part that doesn't fit */
  text-overflow: ellipsis;    /* 3. show "…" where it's cut */
}
```

**Why each one is needed:**

| Missing | What happens |
|---|---|
| `white-space: nowrap` | text just wraps onto more lines, so nothing overflows to cut |
| `overflow: hidden` | text spills out of the card |
| `text-overflow: ellipsis` | text is cut abruptly, with no "…" |

**The element also needs a limited width** (here, the 280px card). On an inline element like `<span>`, add `display: block` or `inline-block` plus a `max-width`.

## Multi-line clamp

```css
.description {
  display: -webkit-box;           /* required for line-clamp */
  -webkit-box-orient: vertical;   /* required */
  -webkit-line-clamp: 2;          /* number of lines to show */
  overflow: hidden;               /* hide the rest */
}
```

- **Despite the `-webkit-` prefix, this works in all modern browsers**, including Firefox.
- **The ellipsis is added automatically** at the end of the last visible line.
- **Change `2` to any number of lines.**

**Without line-clamp** (older approach): `max-height: 40px` (2 × the 20px line-height) with `overflow: hidden` cuts after 2 lines, but **without the "…"**.

## Flexbox gotcha

**Ellipsis inside a flex item often doesn't work:**

```css
.row  { display: flex; }
.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }   /* ❌ text still overflows */
```

**Why:** flex items have `min-width: auto`, so they **refuse to shrink** below their content's width, and the text never overflows its own box.

```css
.name { min-width: 0; }     /* ✅ now it can shrink, and the ellipsis appears */
```

The same goes for grid items: use `min-width: 0`, or `minmax(0, 1fr)` columns.

## Accessibility

- **The full text is still in the HTML**, so screen readers read all of it, and search engines see it too.
- **Sighted users can't see the hidden part.** Offer a way to read it: a `title` attribute (tooltip), an expand button, or a details page.

```html
<h3 class="title" title="The complete guide to building fast, accessible and beautiful web apps">...</h3>
```

**Truncating with JavaScript** (`text.slice(0, 50) + '…'`) is usually worse: it doesn't adapt to the screen width or font, and it removes text from the page.

## 🎯 Interview answer

> "For a single line, I need three properties together: `white-space: nowrap` so the text doesn't wrap, `overflow: hidden` to clip it, and `text-overflow: ellipsis` to draw the dots, on an element with a constrained width. For multiple lines, I use line clamping: `display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp` with the number of lines, and `overflow: hidden`; despite the prefix, it works in all modern browsers. A common gotcha is truncation inside a flex or grid item, which needs `min-width: 0` because items don't shrink below their content by default. I prefer CSS truncation over slicing strings in JavaScript, because it adapts to the width and keeps the full text available to screen readers, and I'd provide a title or an expand option so users can still read the full text."
