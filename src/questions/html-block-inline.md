## Short answer

| | **Block** | **Inline** | **Inline-block** |
|---|---|---|---|
| Starts on a new line | ✅ | ❌ (flows with text) | ❌ (flows with text) |
| Takes full width by default | ✅ | ❌ (only as wide as its content) | ❌ |
| `width` / `height` work | ✅ | ❌ **ignored** | ✅ |
| Vertical `margin` / `padding` push other elements | ✅ | ❌ (padding shows, but doesn't move lines) | ✅ |
| Examples | `div`, `p`, `h1`–`h6`, `section`, `ul`, `li`, `form` | `span`, `a`, `strong`, `em`, `img`*, `button`* | anything with `display: inline-block` |

*`img`, `button`, `input` are "inline replaced elements": they sit in a line **but accept width and height**, like inline-block.

**Analogy: text in a book** 📖

- **Block** = a **paragraph**: always starts on a new line and spans the page width.
- **Inline** = a **word**: sits next to other words and wraps with the text.
- **Inline-block** = a **picture placed inside a sentence**: sits in the line, but has its own width and height.

---

## See the difference

```html
<div>Block 1</div>
<div>Block 2</div>
<!-- Block 1 and Block 2 are on separate lines, each full width -->

<span>Inline 1</span> <span>Inline 2</span>
<!-- Inline 1 Inline 2 on the same line -->
```

```css
span {
  width: 200px;        /* ❌ ignored: inline elements don't take width */
  height: 50px;        /* ❌ ignored */
  margin-top: 20px;    /* ❌ no effect on layout */
  padding: 10px;       /* ⚠️ background grows, but it overlaps lines above/below */
}

span.badge {
  display: inline-block;   /* ✅ now width, height and vertical margin work */
  width: 80px;
  padding: 4px 8px;
}
```

---

## Changing display

```css
a.button   { display: inline-block; padding: 8px 16px; }   /* link that looks like a button */
li         { display: inline; }                              /* horizontal list (old way) */
.hidden    { display: none; }                                /* removed from the layout */
.row       { display: flex; }                                /* flex container: children laid out in a row */
.layout    { display: grid; }                                /* grid container */
```

**`display` controls two things:**

- **Outer:** how the element itself behaves among its siblings (block or inline).
- **Inner:** how its **children** are laid out (normal flow, `flex` or `grid`).

`inline-flex` = sits inline, but its children use flexbox.

---

## The inline-block gap

**Inline-block elements have small gaps between them**, because the whitespace (newlines and spaces) in your HTML is treated as text:

```html
<div class="tab">A</div>
<div class="tab">B</div>     <!-- a ~4px gap appears between A and B -->
```

**Fix it:** use **flexbox** (`display: flex` on the parent). Flex ignores those whitespace text nodes. That's one reason flexbox replaced inline-block for layouts.

---

## Quick Q&A

**Q: Block vs inline elements?**
Block elements start on a new line and take the full width, and width and height apply. Inline elements flow within text, are only as wide as their content, and ignore width, height and vertical margins.

**Q: Why use inline-block?**
To keep an element in the text flow (side by side) while still controlling its width, height and vertical spacing, for example buttons or badges.

**Q: Can you put a block element inside an inline one?**
Generally avoid it (like a `div` inside a `span`). HTML5 allows `<a>` to wrap block content, such as a whole card.

**Q: What is a replaced element?**
An element whose content comes from outside CSS, like `img`, `video` or `input`. They're inline but accept width and height.

---

## 🎯 Interview answer

> "Block elements like div, p, headings and lists start on a new line, stretch to the full width of their container by default, and respect width, height, margins and padding. Inline elements like span, a and strong flow with the text, are only as wide as their content, and ignore width, height and vertical margins; vertical padding paints but doesn't push surrounding lines. Inline-block combines both: it sits in the line like inline but accepts width, height and vertical spacing, which suits buttons and badges. Replaced elements like img and input behave like inline-block. The `display` property changes this, and also sets how children are laid out, with flex or grid. A classic gotcha is the whitespace gap between inline-block elements, which is why I use flexbox for rows of items."
