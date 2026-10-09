## Problem

Center the blue `.box` inside the dashed `.container`, **horizontally and vertically**, using only HTML and CSS.

- **Don't change the box's size** (120 × 80) or the container's height (300px).
- **It must stay centred if the container changes size**, so no hard-coded pixel offsets like `margin-top: 110px`.
- **Then try again with a different method!** Interviewers love asking "how many ways can you centre a div?"

## Examples

```
┌──────────────── .container ────────────────┐
│                                            │
│                ┌──────────┐                │
│                │   .box   │                │
│                └──────────┘                │
│                                            │
└────────────────────────────────────────────┘
```

## Hints

1. **Horizontally only:** a block with a width can use `margin: 0 auto`. Why doesn't `auto` work vertically?
2. **Flexbox:** which two properties align along each axis?
3. **Grid:** there's a one-word property that centres in both directions.
4. **Positioning:** `top: 50%` moves the box's **top edge** to the middle, so how do you pull it back by half its own height?

<!-- SOLUTION -->

## margin: 0 auto

**Horizontal only.** The classic answer for centring a **block element with a width**:

```css
.box {
  width: 120px;
  margin: 0 auto;     /* top/bottom 0, left/right auto */
}
```

**How it works:** the free space left over in the row is **split equally** between the left and right `auto` margins.

**Why doesn't `margin: auto` centre vertically here?** In normal block flow, `auto` top and bottom margins are treated as **0**. A block's height is decided by its content, and there's no "free vertical space" to share. (Inside **flex** or **grid** it's different: see below.)

**Doesn't work for:** inline elements (`span`) or blocks **without a width** (they already fill the row).

## Flexbox

```css
.container {
  display: flex;
  justify-content: center;   /* main axis → horizontal */
  align-items: center;       /* cross axis → vertical */
}
```

**The most popular answer.** Works for any size, even when the box's size is unknown. ✅ Passes every check.

## Grid place-items

```css
.container {
  display: grid;
  place-items: center;       /* = align-items: center + justify-items: center */
}
```

**The shortest way.** ✅ Passes every check.

## margin: auto in flex/grid

**Inside a flex or grid container, `margin: auto` works in BOTH directions:**

```css
.container { display: flex; }      /* or display: grid */
.box       { margin: auto; }       /* auto margins absorb all free space on every side */
```

**This is a nice "bonus" answer:** the same `margin: auto` from method 1, now centring vertically too, because flex and grid items **do** have free space to share.

## Absolute + transform

```css
.container {
  position: relative;              /* reference box for the absolute child */
}

.box {
  position: absolute;
  top: 50%;                        /* top edge at 50% of the container */
  left: 50%;                       /* left edge at 50% */
  transform: translate(-50%, -50%);  /* pull back by half of the box's OWN width and height */
}
```

```
top: 50%; left: 50% only:          with translate(-50%, -50%):
┌────────────────────┐             ┌────────────────────┐
│                    │             │                    │
│          ┌────┐    │             │       ┌────┐       │
│          │box │    │             │       │box │       │
│          └────┘    │             │       └────┘       │
└────────────────────┘             └────────────────────┘
 (top-left corner is centred)       (the box's centre is centred) ✅
```

- **Works even when the box's size is unknown**, because `translate` percentages refer to the element itself.
- **Common for modals and overlays.**
- **⚠️ Forgot `position: relative` on the container?** The box centres on the **page** instead.

## Absolute + inset + margin

**For a box with a known size:**

```css
.container { position: relative; }

.box {
  position: absolute;
  inset: 0;                 /* top: 0; right: 0; bottom: 0; left: 0 */
  margin: auto;             /* with all 4 sides set, auto margins centre it */
  width: 120px;             /* ⚠️ needs a size, or it would stretch to fill */
  height: 80px;
}
```

## Text & inline methods

**For inline content or a single line of text:**

```css
/* horizontal: centre inline content (text, inline-block children) */
.container { text-align: center; }
.box       { display: inline-block; }

/* vertical, single line of text only: line-height = container height */
.label { height: 50px; line-height: 50px; }
```

- **`text-align: center` centres the content inside a block**, not the block itself.
- **The `line-height` trick only works for one line of text.** It's a common answer for buttons and badges, but breaks if the text wraps.

## Table-cell (legacy)

**The old pre-flexbox way, still seen in old codebases and HTML emails:**

```css
.container {
  display: table-cell;
  vertical-align: middle;    /* vertical */
  text-align: center;        /* horizontal (for inline content) */
  width: 500px;              /* table cells don't stretch like blocks */
}
.box { display: inline-block; }
```

**Know it exists. Use flex or grid instead.**

## Comparison

| Method | Horizontal | Vertical | Unknown size OK? | Use when |
|---|---|---|---|---|
| `margin: 0 auto` | ✅ | ❌ | needs a width | centring a page container or block |
| **Flexbox** | ✅ | ✅ | ✅ | ⭐ the go-to answer |
| **Grid `place-items`** | ✅ | ✅ | ✅ | ⭐ the shortest |
| Flex/grid + `margin: auto` | ✅ | ✅ | ✅ | one item, neat trick |
| Absolute + `translate(-50%, -50%)` | ✅ | ✅ | ✅ | modals, overlays, on top of other content |
| Absolute + `inset: 0; margin: auto` | ✅ | ✅ | ❌ needs a size | fixed-size overlays |
| `text-align` / `line-height` | ✅ | ✅ (1 line) | — | text and inline content |
| `table-cell` | ✅ | ✅ | ✅ | legacy and emails |

**Centring the whole page:** use `min-height: 100vh` (or `100dvh`) on the container, so it's as tall as the screen:

```css
body { min-height: 100dvh; display: grid; place-items: center; margin: 0; }
```

## 🎯 Interview answer

> "It depends on the context. For horizontal centring of a block with a width, `margin: 0 auto` works, because the left and right auto margins split the free space; it doesn't centre vertically, because in normal flow auto top and bottom margins compute to zero. For both directions, my default is flexbox with `justify-content: center` and `align-items: center` on the parent, or grid with `place-items: center`, which is the shortest; and inside a flex or grid container, `margin: auto` on the child centres it both ways. When the element must sit on top of other content, like a modal, I use `position: absolute` with `top` and `left` at 50% and `transform: translate(-50%, -50%)`, with the parent positioned relative; the translate percentages refer to the element itself, so its size doesn't need to be known. For inline content there's `text-align: center`, and for a single line, matching `line-height` to the height. Table-cell with `vertical-align: middle` is the legacy approach."
