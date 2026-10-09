## Short answer

**CSS variables (officially "custom properties") store values you reuse across your CSS:**

```css
:root {
  --brand: #2563eb;          /* define (must start with --) */
  --space: 16px;
}

.button {
  background: var(--brand);  /* use */
  padding: var(--space);
}
```

**Unlike Sass variables, CSS variables are live in the browser.** They follow the cascade and inheritance, can be changed per element, inside media queries, or with JavaScript at runtime. That's what makes **themes and dark mode** easy.

**Analogy: a paint palette** 🎨 Instead of mixing "that exact blue" again and again, you mix it once, put it on the palette (`--brand`), and dip into it everywhere. Change the palette colour, and everything painted with it updates.

---

## Basics

```css
:root {
  --text: #1f2937;
  --radius: 8px;
}

.card {
  color: var(--text);
  border-radius: var(--radius);
  padding: var(--card-padding, 24px);     /* fallback if --card-padding isn't defined */
}
```

- **Names are case-sensitive:** `--Brand` ≠ `--brand`.
- **`:root`** (the `<html>` element) makes them global.
- **Fallback:** `var(--name, fallback)`.

---

## Scope & inheritance

**Variables inherit, so you can override them for one part of the page:**

```css
:root      { --accent: blue; }
.danger    { --accent: red; }             /* only inside .danger */

.button    { background: var(--accent); }
```

```html
<button class="button">Blue</button>
<div class="danger">
  <button class="button">Red</button>     <!-- same CSS, different value -->
</div>
```

**This makes components themeable:** one `.button` style, with variants just changing variables.

```css
.btn           { background: var(--btn-bg, #e5e7eb); color: var(--btn-color, #111); }
.btn.primary   { --btn-bg: #2563eb; --btn-color: white; }
.btn.danger    { --btn-bg: #dc2626; --btn-color: white; }
```

---

## Dark mode

```css
:root {
  --bg: #ffffff;
  --text: #111827;
  --card: #f3f4f6;
}

@media (prefers-color-scheme: dark) {      /* follow the OS setting */
  :root {
    --bg: #0f172a;
    --text: #f1f5f9;
    --card: #1e293b;
  }
}

[data-theme='dark'] {                       /* or a manual toggle */
  --bg: #0f172a;
  --text: #f1f5f9;
  --card: #1e293b;
}

body  { background: var(--bg); color: var(--text); }
.card { background: var(--card); }
```

```js
// toggle button
document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
```

**You only redefine the variables.** Every component updates automatically.

---

## With JavaScript

```js
const root = document.documentElement

getComputedStyle(root).getPropertyValue('--brand')    // read: " #2563eb"
root.style.setProperty('--brand', '#16a34a')           // change at runtime → whole site updates

// e.g. follow the mouse for a spotlight effect
card.addEventListener('mousemove', (e) => {
  card.style.setProperty('--x', `${e.offsetX}px`)
  card.style.setProperty('--y', `${e.offsetY}px`)
})
```

```css
.card { background: radial-gradient(circle at var(--x) var(--y), #fff3, transparent 40%); }
```

**In React:** `<div style={{ '--progress': percent + '%' }}>`, then use `width: var(--progress)` in CSS.

---

## With calc()

```css
:root { --space: 8px; }

.stack > * + * { margin-top: calc(var(--space) * 2); }   /* 16px */

.grid { --cols: 3; grid-template-columns: repeat(var(--cols), 1fr); }
@media (max-width: 600px) { .grid { --cols: 1; } }        /* change one variable, not the whole rule */
```

**Gotcha:** variables are **substituted as text**:

```css
--size: 20;
width: var(--size)px;          /* ❌ doesn't work: becomes "20 px" */
width: calc(var(--size) * 1px); /* ✅ */
```

---

## CSS vs Sass variables

| | **CSS custom properties** | **Sass `$variables`** |
|---|---|---|
| Exists in the browser | ✅ (live) | ❌ compiled away at build time |
| Change at runtime (JS, themes) | ✅ | ❌ |
| Cascade and inheritance | ✅ scoped to elements | ❌ (lexical scope in the source file) |
| Change inside a media query | ✅ | ❌ (needs the whole rule repeated) |
| Use in selectors / media query conditions | ❌ | ✅ |

**Design tokens** (colours, spacing, fonts) are usually defined as CSS variables today, and Tailwind v4 is built on them.

---

## Quick Q&A

**Q: What are CSS custom properties?**
Variables defined with `--name: value` and used with `var(--name, fallback)`. They're resolved at runtime and follow the cascade and inheritance.

**Q: CSS variables vs Sass variables?**
Sass variables are replaced at build time; CSS variables exist in the browser, so they can change per element, in media queries, or from JavaScript, which is ideal for theming.

**Q: How would you implement dark mode?**
Define colour variables on `:root`, redefine them under `@media (prefers-color-scheme: dark)` or a `[data-theme='dark']` selector, and use the variables everywhere.

**Q: How do you change a CSS variable with JavaScript?**
`element.style.setProperty('--name', value)`, and read it with `getComputedStyle(element).getPropertyValue('--name')`.

---

## 🎯 Interview answer

> "CSS custom properties are variables defined with a double-dash name, like `--brand: #2563eb`, and read with `var(--brand, fallback)`. Unlike Sass variables, which are compiled away, they live in the browser, so they follow the cascade and inherit down the tree: I can define global tokens on `:root` and override them for a component or section, which makes variants like primary and danger buttons just a matter of changing variables. That's also the cleanest way to do theming and dark mode: redefine the colour variables under `prefers-color-scheme: dark` or a `data-theme` attribute, and every component updates. They can be changed at runtime with `style.setProperty`, combined with `calc()`, and redefined inside media queries. One gotcha is that they're substituted as text, so units must be added with calc, like `calc(var(--size) * 1px)`."
