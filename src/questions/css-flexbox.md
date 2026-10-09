## Short answer

**Flexbox lays out items in one direction: a row or a column.** It makes it easy to:

- **put items side by side**
- **space them out evenly**
- **align them** (including vertical centering)
- **let them grow or shrink** to fill space

```css
.container {
  display: flex;               /* children become flex items */
  justify-content: center;     /* along the main axis (row → horizontal) */
  align-items: center;         /* across it (row → vertical) */
  gap: 16px;                   /* space between items */
}
```

**Analogy: books on a shelf** 📚 You decide which way they line up (row or column), how to spread them (packed left, centred, evenly spaced), how they line up vertically, and which ones may stretch to fill gaps.

---

## Main axis vs cross axis

```
flex-direction: row (default)
 ──── main axis (justify-content) ────▶
 ┌──────┐ ┌──────┐ ┌──────┐
 │  1   │ │  2   │ │  3   │   │ cross axis
 └──────┘ └──────┘ └──────┘   ▼ (align-items)

flex-direction: column → the axes swap:
 justify-content = vertical, align-items = horizontal
```

**Remember:** `justify-content` works on the **main** axis, and `align-items` on the **cross** axis. When the direction changes, they swap.

---

## Container properties

| Property | Values | Does |
|---|---|---|
| `flex-direction` | `row` · `column` · `row-reverse` · `column-reverse` | Direction of the main axis |
| `justify-content` | `flex-start` · `center` · `flex-end` · `space-between` · `space-around` · `space-evenly` | Distribution along the main axis |
| `align-items` | `stretch` (default) · `center` · `flex-start` · `flex-end` · `baseline` | Alignment across the axis |
| `flex-wrap` | `nowrap` (default) · `wrap` | Allow items onto new lines |
| `align-content` | like `justify-content` | Spacing between **lines** (only when wrapping) |
| `gap` | `16px` / `16px 24px` | Space between items |

```
justify-content:
flex-start     [1][2][3]            
center              [1][2][3]       
space-between  [1]      [2]      [3]
space-around    [1]    [2]    [3]   
space-evenly     [1]   [2]   [3]    
```

---

## Item properties

| Property | Does |
|---|---|
| **`flex-grow`** | How much **extra** space the item takes (0 = none) |
| **`flex-shrink`** | How much it **shrinks** when space is short (1 = default, 0 = never) |
| **`flex-basis`** | Starting size before growing or shrinking (`auto`, `200px`, `30%`) |
| **`flex`** | Shorthand: `flex: grow shrink basis` |
| `align-self` | Override `align-items` for one item |
| `order` | Visual order (⚠️ doesn't change keyboard or screen reader order) |

```css
flex: 1;          /* = 1 1 0%  → share space equally */
flex: auto;       /* = 1 1 auto → grow from the content size */
flex: none;       /* = 0 0 auto → fixed: never grow or shrink */
flex: 0 0 250px;  /* exactly 250px */
```

---

## Common layouts

### Navbar: logo left, links right

```css
.navbar { display: flex; justify-content: space-between; align-items: center; }
```

### Sidebar + content

```css
.layout  { display: flex; }
.sidebar { flex: 0 0 250px; }     /* fixed 250px */
.content { flex: 1; }             /* takes the rest */
```

### Push one item to the end

```css
.toolbar { display: flex; gap: 8px; }
.toolbar .logout { margin-left: auto; }   /* auto margin eats all free space → pushed right */
```

### Perfect centering

```css
.center { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
```

### Sticky footer (footer at the bottom on short pages)

```css
body   { display: flex; flex-direction: column; min-height: 100vh; }
main   { flex: 1; }               /* main grows, pushing the footer down */
```

### Wrapping cards

```css
.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.card  { flex: 1 1 250px; }       /* at least ~250px, grow to fill, wrap when needed */
```

---

## Gotchas

| Problem | Fix |
|---|---|
| Long text or URLs overflow a flex item | `min-width: 0` on the item (flex items default to `min-width: auto`) |
| Images get squashed | `flex-shrink: 0` on the image |
| Items stretch to equal height (unwanted) | `align-items: flex-start` (the default is `stretch`) |
| `justify-content` does nothing | No free space: items already fill the row |
| `order` messes up tabbing | Change the HTML order instead |

---

## Quick Q&A

**Q: `justify-content` vs `align-items`?**
`justify-content` aligns items along the main axis (horizontal in a row); `align-items` aligns them on the cross axis (vertical in a row). They swap with `flex-direction: column`.

**Q: What does `flex: 1` mean?**
`flex-grow: 1; flex-shrink: 1; flex-basis: 0%`: items share the available space equally.

**Q: How do you centre something with flexbox?**
`display: flex; justify-content: center; align-items: center` on the parent.

**Q: Why does my flex item overflow?**
Flex items have `min-width: auto`, so they won't shrink below their content's size. Set `min-width: 0`.

**Q: `space-between` vs `space-around` vs `space-evenly`?**
`between`: no space at the edges. `around`: half-size space at the edges. `evenly`: equal space everywhere, including the edges.

---

## 🎯 Interview answer

> "Flexbox is a one-dimensional layout system: a flex container lays out its children along a main axis, a row by default or a column with `flex-direction`. `justify-content` distributes items along the main axis, with values like center or space-between, and `align-items` aligns them on the cross axis, defaulting to stretch; the two swap meaning when the direction is column. `gap` adds spacing and `flex-wrap` lets items wrap. On items, `flex-grow`, `flex-shrink` and `flex-basis`, usually written as the `flex` shorthand, control how they share space: `flex: 1` splits space equally and `flex: 0 0 250px` fixes a width. Common patterns are navbars with space-between, a sidebar plus `flex: 1` content, `margin-left: auto` to push an item to the end, centering with justify-content and align-items, and sticky footers. A classic gotcha is overflowing text, fixed with `min-width: 0`, because flex items don't shrink below their content by default."
