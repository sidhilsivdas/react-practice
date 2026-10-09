## Short answer

**CSS Grid is a two-dimensional layout system:** rows **and** columns at the same time. You define a grid on the parent, and place items into its cells.

| | **Flexbox** | **Grid** |
|---|---|---|
| Dimensions | **1D**: a row **or** a column | **2D**: rows **and** columns |
| Driven by | the **content** (items decide their size) | the **layout** (the grid defines the tracks) |
| Best for | navbars, toolbars, button groups, centring, one row of cards | page layouts, card grids, dashboards, galleries, forms |
| Overlap items | ❌ hard | ✅ easy (same cell) |

**They work together:** Grid for the page structure, Flexbox inside the components.

**Analogy:**

- **Flexbox** = a **queue** of people: you only decide how they line up in one line.
- **Grid** = a **chessboard** or spreadsheet: every item has a row **and** a column.

---

## Basics

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;   /* 3 columns: fixed + two equal shares */
  grid-template-rows: auto 300px;
  gap: 16px;                               /* space between rows and columns */
}
```

**The `fr` unit = a fraction of the free space.** `1fr 2fr` means the second column is twice as wide as the first.

### `repeat()` and `minmax()`

```css
grid-template-columns: repeat(3, 1fr);              /* 3 equal columns */
grid-template-columns: repeat(4, minmax(0, 1fr));    /* 4 equal columns that never overflow */
grid-template-columns: 250px minmax(0, 1fr);         /* sidebar + flexible content */
```

---

## Responsive grid ⭐

**The famous one-liner:** as many columns as fit, each at least 250px, with **no media queries**:

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
```

```
wide screen:   [card][card][card][card]
tablet:        [card][card][card]
phone:         [card]
```

| | `auto-fit` | `auto-fill` |
|---|---|---|
| Few items on a wide screen | items **stretch** to fill the row | empty columns are **kept**, so items stay narrow |

---

## Placing items

```css
.header  { grid-column: 1 / -1; }         /* from the first to the last line: full width */
.feature { grid-column: span 2; }         /* take 2 columns */
.tall    { grid-row: span 2; }            /* take 2 rows */
.item    { grid-column: 2 / 4; }          /* from line 2 to line 4 (2 columns) */
```

**Lines are numbered from 1**, and `-1` means the last line.

---

## Named areas

**Draw the layout with names:**

```css
.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }

@media (max-width: 700px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:            /* stack everything on phones */
      "header"
      "main"
      "sidebar"
      "footer";
  }
}
```

**This is the "holy grail" layout** (header, sidebar, main, footer) in a few lines, and you rearrange it for phones just by changing the areas.

---

## Alignment

```css
.grid {
  justify-items: center;       /* horizontal, inside each cell */
  align-items: center;         /* vertical, inside each cell */
  place-items: center;         /* both at once */
}

.item { place-self: end; }      /* one item */
```

**Centre anything:**

```css
.center { display: grid; place-items: center; min-height: 100vh; }
```

---

## Which one?

```
One row or column of items, sized by content (nav, buttons)?   → Flexbox
A grid of rows AND columns (cards, gallery, dashboard)?        → Grid
The overall page skeleton (header/sidebar/main/footer)?        → Grid
Centring a single thing?                                       → either (grid place-items is shortest)
Items that wrap but should line up in columns?                 → Grid (flex wrap rows don't align)
```

**Subgrid** (`grid-template-rows: subgrid`, now supported in modern browsers) lets nested elements line up with the parent grid, for example card titles and buttons aligned across cards.

---

## Quick Q&A

**Q: Flexbox vs Grid?**
Flexbox is one-dimensional and content-driven, great for a row or column of items. Grid is two-dimensional and layout-driven, great for page layouts and card grids. They're often combined.

**Q: What is the `fr` unit?**
A fraction of the remaining free space in the grid container.

**Q: How do you make a responsive grid without media queries?**
`grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`.

**Q: `auto-fit` vs `auto-fill`?**
With few items, `auto-fit` collapses empty tracks so items stretch; `auto-fill` keeps empty tracks, so items keep their minimum width.

**Q: How do you make an item span the full width?**
`grid-column: 1 / -1`.

---

## 🎯 Interview answer

> "Grid is a two-dimensional layout system where the container defines rows and columns, and items are placed into them, while Flexbox is one-dimensional and content-driven, laying items out along a single row or column. I define tracks with `grid-template-columns` using `fr` units, `repeat` and `minmax`, add `gap`, and place items with line numbers like `grid-column: 1 / -1` or span, or with named `grid-template-areas`, which makes a header, sidebar, main and footer layout readable and easy to rearrange in a media query. For responsive card grids, `repeat(auto-fit, minmax(250px, 1fr))` fits as many columns as possible without media queries. I use Grid for page structure and grids of cards, Flexbox for components like navbars and button groups, and often both together; and `display: grid; place-items: center` is the shortest way to centre something."
