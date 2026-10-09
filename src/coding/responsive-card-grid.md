## Problem

Lay out the 6 `.card` elements in a **responsive grid**:

- **Wide screens:** **3 equal columns**.
- **Phones** (narrower than **600px**): **1 column**, with each card taking the full width.
- **A 16px gap** between cards, both horizontally and vertically.

The checks resize the page to **900px** and **400px** wide to test both layouts.

## Examples

```
900px wide                          400px wide
┌──────┐ ┌──────┐ ┌──────┐          ┌──────────────┐
│  1   │ │  2   │ │  3   │          │      1       │
└──────┘ └──────┘ └──────┘          └──────────────┘
┌──────┐ ┌──────┐ ┌──────┐          ┌──────────────┐
│  4   │ │  5   │ │  6   │          │      2       │
└──────┘ └──────┘ └──────┘          └──────────────┘
                                          ...
```

## Hints

1. **`display: grid`** with `grid-template-columns` and `gap`.
2. **`repeat(3, 1fr)`** makes 3 equal columns.
3. **A media query** (`@media (max-width: 599px)`) can switch to 1 column. Or try the famous `auto-fit` + `minmax()` trick, with no media query at all.

<!-- SOLUTION -->

## Grid + media query

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* 3 equal columns */
  gap: 16px;                               /* row and column gaps */
}

@media (max-width: 599px) {
  .grid {
    grid-template-columns: 1fr;            /* phones: 1 column */
  }
}
```

**Mobile-first version** (the base style is for phones, then add columns as space grows):

```css
.grid { display: grid; grid-template-columns: 1fr; gap: 16px; }

@media (min-width: 600px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

**`1fr` vs `minmax(0, 1fr)`:** if a card contains a very long word or URL, `1fr` columns can grow wider than their share. `repeat(3, minmax(0, 1fr))` keeps them strictly equal.

## auto-fit + minmax

**No media query:** as many columns as fit, each at least 250px wide:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
```

**How it works:**

- **`minmax(250px, 1fr)`:** each column is at least 250px, and shares the extra space equally.
- **`auto-fit`:** creates as many columns as fit in the row.

```
900px page → about 3 columns of 250px+ fit → 3 columns ✅
400px page → only 1 fits                   → 1 column  ✅
700px page → 2 fit                         → 2 columns (a bonus tablet layout!)
```

⚠️ **The exact column count depends on the container width**, so this is great for real sites, but if the spec says "exactly 3 columns" at a certain width, the media query version is more precise.

## Flexbox version

```css
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.card {
  flex: 1 1 calc((100% - 32px) / 3);   /* 3 per row: (full width - 2 gaps) / 3 */
}

@media (max-width: 599px) {
  .card { flex-basis: 100%; }
}
```

- **It works, but it's more maths** (you subtract the gaps yourself).
- **The last row behaves differently:** with 5 cards, the last two **stretch** to fill the row, while grid keeps them in columns.
- **That's why Grid is the better tool for 2D layouts.**

## Common mistakes

| Mistake | Result |
|---|---|
| `width: 33%` + `margin` on cards | the margins push the third card onto a new line |
| No `box-sizing: border-box` with flex and padding | cards are wider than their basis, so 2 per row (the preview already sets border-box, as most projects do) |
| `max-width: 600px` in the query | at exactly 600px it still shows 1 column. The spec says "narrower than 600px", so use `599px`, or mobile-first `min-width: 600px` |
| Forgetting the viewport meta tag on a real site | phones ignore your media queries (the preview already includes it) |

## 🎯 Interview answer

> "I'd use CSS Grid: `display: grid`, `grid-template-columns: repeat(3, 1fr)` and `gap: 16px`, then a media query below 600px that switches to a single `1fr` column, or write it mobile-first with one column by default and three columns from 600px up. Using `minmax(0, 1fr)` keeps the columns strictly equal even with long content. If the exact count isn't required, `repeat(auto-fit, minmax(250px, 1fr))` gives a fully fluid grid without any media queries, fitting as many columns as there's room for. Flexbox with wrapping can do it too, but you have to subtract the gaps in a calc and the last row stretches, which is why grid is the better fit for two-dimensional layouts."
