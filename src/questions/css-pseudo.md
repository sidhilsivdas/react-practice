## Short answer

| | **Pseudo-class** `:` | **Pseudo-element** `::` |
|---|---|---|
| Selects | an element in a **special state or position** | a **part** of an element, or **adds** content |
| Examples | `:hover`, `:focus`, `:first-child`, `:nth-child(2)`, `:checked`, `:disabled` | `::before`, `::after`, `::placeholder`, `::first-line`, `::selection` |
| Think of it as | "**when** / **which** element" | "**a piece** of the element" |

**Analogy: a house** 🏠

- **Pseudo-class** = the house **when** the lights are on, or **the first** house on the street.
- **Pseudo-element** = **a part of** the house (the roof, the porch), or a **sign you hang on it**.

---

## Common pseudo-classes

### User interaction

```css
a:hover          { text-decoration: underline; }
button:active    { transform: scale(0.98); }        /* while being pressed */
input:focus      { border-color: blue; }
button:focus-visible { outline: 3px solid #2563eb; }  /* ⭐ focus ring only for keyboard users */
a:visited        { color: purple; }
```

### Structure (position among siblings)

```css
li:first-child       { font-weight: bold; }
li:last-child        { border-bottom: none; }
li:nth-child(2)      { color: red; }               /* the 2nd */
tr:nth-child(odd)    { background: #f5f5f5; }      /* zebra stripes (also: even, 2n+1) */
li:nth-child(3n)     { margin-right: 0; }           /* every 3rd */
p:only-child         { ... }
h2:first-of-type     { ... }                        /* first h2 among its siblings */
```

**`:nth-child` vs `:nth-of-type`:** `p:nth-child(2)` = "the 2nd child, **if** it's a p". `p:nth-of-type(2)` = "the 2nd **p** child".

### Forms

```css
input:checked + label   { font-weight: bold; }
input:disabled          { opacity: 0.5; }
input:required          { border-left: 3px solid orange; }
input:invalid:not(:placeholder-shown) { border-color: red; }   /* show errors only after typing */
```

### Logical (powerful modern selectors)

```css
.btn:not(.primary)       { background: white; }
:is(h1, h2, h3):hover    { color: blue; }          /* shorter than three selectors */
.card:has(img)           { padding: 0; }           /* ⭐ "parent selector": a card that CONTAINS an img */
form:has(input:invalid) button { opacity: 0.5; }   /* style the button if any input is invalid */
```

**`:has()` finally lets CSS style a parent based on its children**, which used to need JavaScript. It's supported in all modern browsers.

---

## Pseudo-elements

### `::before` and `::after`

**They insert a virtual child at the start or end of the element's content.** They need **`content`** (even an empty one) to appear.

```css
.required::after {
  content: ' *';
  color: red;
}

.quote::before {
  content: '“';
  font-size: 3rem;
}

/* decorative shapes and overlays, without extra HTML */
.card {
  position: relative;
}
.card::after {
  content: '';                       /* ⚠️ required, even if empty */
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}
```

**Common uses:** icons, decorative lines, badges, tooltips, overlays, clearfix, custom checkboxes and quotes.

**Limits:**

- **They don't work on `<img>`, `<input>` and other replaced elements.** Those have no content box to insert into.
- **Generated text isn't selectable**, and screen readers may not read it reliably. **Don't put important content in them.**

### Others

```css
input::placeholder  { color: #999; }
p::first-line       { font-weight: bold; }
p::first-letter     { font-size: 3em; float: left; }   /* drop cap */
::selection         { background: yellow; }             /* highlighted text */
li::marker          { color: red; }                     /* list bullets */
```

---

## Specificity

- **Pseudo-classes** count like a **class**: (0, 1, 0).
- **Pseudo-elements** count like an **element**: (0, 0, 1).
- **`:is()`, `:not()`, `:has()`** use their most specific argument; **`:where()`** is always 0.

**`:` vs `::`:** CSS3 introduced `::` to separate pseudo-elements from pseudo-classes. Browsers still accept `:before` for old code, but write `::before`.

---

## Quick Q&A

**Q: Pseudo-class vs pseudo-element?**
A pseudo-class (`:hover`, `:nth-child`) selects an element based on its state or position. A pseudo-element (`::before`, `::placeholder`) styles a part of an element or inserts generated content.

**Q: Why doesn't my `::before` show up?**
It needs a `content` property (even `content: ''`), and it doesn't work on replaced elements like img or input.

**Q: `:focus` vs `:focus-visible`?**
`:focus` matches whenever the element is focused (including mouse clicks); `:focus-visible` matches when the browser thinks a focus ring should show, typically keyboard navigation.

**Q: What is `:has()`?**
A relational pseudo-class that selects an element if it contains something matching the selector, effectively a parent selector.

**Q: `nth-child` vs `nth-of-type`?**
`nth-child` counts all sibling elements; `nth-of-type` counts only siblings of the same tag.

---

## 🎯 Interview answer

> "Pseudo-classes, written with one colon, select an element based on its state or position: `:hover`, `:focus-visible`, `:checked`, `:disabled`, `:first-child`, `:nth-child(odd)`, and logical ones like `:not`, `:is` and `:has`, which finally lets CSS style a parent based on its children. Pseudo-elements, written with two colons, target a part of an element or insert generated content: `::before` and `::after` add a virtual first or last child and need a `content` property, and others include `::placeholder`, `::first-letter`, `::selection` and `::marker`. I use `::before` and `::after` for decorative things like icons, overlays and required-field asterisks, but not for meaningful content, since screen readers may not read it reliably, and they don't work on replaced elements like images and inputs. For specificity, pseudo-classes count like classes and pseudo-elements like elements."
