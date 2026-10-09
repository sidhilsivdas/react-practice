## Short answer

**When several CSS rules target the same element, the browser picks the winner in this order:**

1. **Importance:** `!important` beats normal declarations.
2. **Specificity:** the more specific selector wins.
3. **Source order:** if specificity is equal, the rule written **last** wins.

**Specificity is scored as (IDs, classes, elements):**

| Selector part | Counts as | Example |
|---|---|---|
| Inline `style=""` | beats all selectors | `<p style="color:red">` |
| **ID** | (1, 0, 0) | `#header` |
| **Class, attribute, pseudo-class** | (0, 1, 0) | `.btn`, `[type="text"]`, `:hover` |
| **Element, pseudo-element** | (0, 0, 1) | `div`, `p`, `::before` |
| Universal `*`, combinators (`>`, `+`, `~`, space) | nothing | |

**Compare left to right, like version numbers:** `(1,0,0)` beats `(0,15,0)`. **One ID beats any number of classes.**

**Analogy: playing cards** 🃏 An ace (ID) beats any number of kings (classes), and a king beats any number of queens (elements). Only if both hands match do you look at who played **last**.

---

## Examples

```css
p                    { color: black; }   /* (0, 0, 1) */
.text                { color: blue; }    /* (0, 1, 0) */
p.text               { color: green; }   /* (0, 1, 1) */
#intro               { color: red; }     /* (1, 0, 0) */
#intro p.text:hover  { color: purple; }  /* (1, 2, 1) */
```

```html
<p id="intro" class="text">Hello</p>      <!-- red: the ID wins -->
```

| Selector | Score |
|---|---|
| `nav ul li a` | (0, 0, 4) |
| `.nav a` | (0, 1, 1) ← wins over the one above |
| `.nav .link:hover` | (0, 3, 0) |
| `#main .card h2` | (1, 1, 1) |
| `button[disabled]` | (0, 1, 1) |

---

## Special cases

| Selector | Specificity |
|---|---|
| `:is(.a, #b)` | takes its **most specific** argument → (1, 0, 0) |
| `:not(.a)` / `:has(.a)` | same rule: the most specific argument |
| **`:where(.a, #b)`** | ⭐ **always (0, 0, 0)**: easy to override |
| `*` | (0, 0, 0) |

```css
:where(.card) h2 { margin: 0; }    /* (0,0,1): library defaults that are easy to override */
```

---

## !important

```css
.btn { color: white !important; }   /* beats even inline styles (unless they're !important too) */
```

**Avoid it.** The only way to override `!important` is another `!important` with higher specificity, which starts a war that makes CSS impossible to maintain.

**OK uses:** utility classes (`.hidden { display: none !important }`), overriding third-party styles you can't edit, and accessibility overrides like reduced motion.

---

## The cascade & inheritance

**The full cascade order** (simplified, lowest to highest):

1. **Browser default styles.**
2. **Your normal styles.**
3. **Your `!important` styles.**

**Plus cascade layers:** `@layer reset, base, components, utilities;`. Later layers win over earlier ones **regardless of specificity**, which makes large codebases predictable.

**Inheritance:** some properties pass from parent to child automatically:

| Inherited ✅ | Not inherited ❌ |
|---|---|
| `color`, `font-*`, `line-height`, `text-align`, `visibility`, `cursor` | `margin`, `padding`, `border`, `background`, `width`, `display`, `position` |

```css
body { color: #333; font-family: system-ui; }   /* every element inherits these */
.box { border: inherit; }                       /* force inheritance */
```

**Inherited values have no specificity:** any rule targeting the element directly beats an inherited value.

---

## Keeping specificity low

- **Use classes for styling, not IDs.**
- **Avoid deep nesting:** `.card .title` instead of `#page main .content .card div h2`.
- **Use a naming system:** BEM (`.card__title--large`), CSS Modules, or Tailwind utilities, which keep specificity flat.
- **Use `:where()`** for base styles that should be easy to override.

---

## Quick Q&A

**Q: How is specificity calculated?**
As a tuple of (IDs, classes/attributes/pseudo-classes, elements/pseudo-elements), compared left to right. Inline styles beat selectors, and `!important` beats both.

**Q: Equal specificity: which rule wins?**
The one that appears later in the CSS.

**Q: Why avoid `!important`?**
It breaks the normal cascade, so the only override is another `!important`, which leads to escalation and unmaintainable CSS.

**Q: `:is()` vs `:where()`?**
Both match any selector in their list. `:is()` takes the specificity of its most specific argument; `:where()` always has zero specificity.

**Q: Which properties inherit?**
Mostly text-related ones (color, font, line-height, text-align, visibility), not box-related ones (margin, padding, border, background).

---

## 🎯 Interview answer

> "When multiple rules match an element, the cascade decides: first importance, then specificity, then source order. Specificity is a three-part score of IDs, then classes, attributes and pseudo-classes, then elements and pseudo-elements, compared left to right, so one ID beats any number of classes. Inline styles beat selectors, and `!important` beats everything, but I avoid it because it can only be overridden by another `!important`. Universal selectors and combinators add nothing, `:is` and `:not` take their most specific argument, and `:where` is always zero, which is great for overridable base styles. Separately, inheritance passes text properties like color and font down, but not box properties. To keep CSS maintainable I style with classes, keep selectors shallow, and use conventions like BEM, CSS Modules or utility classes, plus cascade layers in larger codebases."
