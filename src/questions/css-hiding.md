## Short answer

| | Takes up space? | Visible? | Clickable / focusable? | Read by screen readers? | Can animate? |
|---|---|---|---|---|---|
| **`display: none`** | ❌ removed from layout | ❌ | ❌ | ❌ | ❌ |
| **`visibility: hidden`** | ✅ space kept | ❌ | ❌ | ❌ | ✅ (switches at the end) |
| **`opacity: 0`** | ✅ space kept | ❌ (transparent) | ⚠️ **yes, still clickable!** | ✅ yes | ✅ smoothly |
| **`hidden` attribute** | like `display: none` | ❌ | ❌ | ❌ | ❌ |
| **`.sr-only`** (visually hidden) | ❌ (practically) | ❌ | ✅ | ✅ **only for screen readers** | — |

**Analogy: an actor on stage** 🎭

- **`display: none`** = the actor **left the theatre**. Their spot is gone, and others move in.
- **`visibility: hidden`** = the actor stands there wearing an **invisibility cloak**. The spot stays reserved, but you can't interact with them.
- **`opacity: 0`** = a **transparent** actor. Still there, and you can still **bump into** (click) them.

---

## See the difference

```html
<div class="row">
  <span>A</span>
  <span class="hide">B</span>
  <span>C</span>
</div>
```

```
.hide { display: none; }       →  A C      (C moves left: B's space is gone)
.hide { visibility: hidden; }  →  A   C    (gap stays where B was)
.hide { opacity: 0; }          →  A   C    (gap stays, and B can still be clicked or tabbed to!)
```

---

## When to use each

| Goal | Use |
|---|---|
| Hide completely (closed menu, inactive tab, conditional UI) | **`display: none`** / `hidden` attribute |
| Hide but keep the layout from jumping | **`visibility: hidden`** |
| **Fade** in or out with animation | **`opacity`** (+ `visibility` for accessibility, see below) |
| Hide visually but keep it for **screen readers** (icon-only button labels, "skip to content") | **`.sr-only`** |
| Hide from screen readers but keep it visible (decorative icons) | **`aria-hidden="true"`** |

---

## Fading done right

**`display` can't be animated** (it switches instantly). **`opacity: 0` alone leaves an invisible element that still catches clicks and keyboard focus.**

✅ **Combine opacity with visibility:**

```css
.dropdown {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.dropdown.open {
  opacity: 1;
  visibility: visible;      /* now clickable and focusable */
}
```

**`visibility` switches at the end of the fade-out**, so the element can't be clicked once it's hidden.

(Modern CSS can also animate `display` with `transition-behavior: allow-discrete` plus `@starting-style`, in browsers that support it.)

---

## Visually hidden

**Hidden on screen, still read by screen readers:**

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```html
<button>
  <svg aria-hidden="true">...</svg>
  <span class="sr-only">Search</span>          <!-- screen readers say "Search, button" -->
</button>
```

**Don't use `display: none` for this**, because screen readers skip it.

---

## Other ways

| Method | Note |
|---|---|
| `width: 0; height: 0; overflow: hidden` | hacky, but sometimes used in animations |
| `transform: scale(0)` | animatable, keeps the layout space |
| `clip-path: inset(50%)` | used in visually-hidden patterns |
| `position: absolute; left: -9999px` | the old off-screen trick (`.sr-only` is preferred now) |
| React: `{show && <Menu />}` | **removes the element from the DOM**, so its state is lost (unlike CSS hiding) |

**In React:** conditional rendering **unmounts** the component, so its state and effects are gone. Hiding with CSS (or React 19.2's `<Activity mode="hidden">`) **keeps the state**.

---

## Performance

- **Changing `display`** triggers a **reflow** (layout recalculation), since other elements move.
- **Changing `visibility`** causes a **repaint** only (the layout stays).
- **Changing `opacity`** can be handled by the **GPU compositor**, so it's the cheapest to animate.

(See the **Reflow, repaint & animations** question.)

---

## Quick Q&A

**Q: `display: none` vs `visibility: hidden`?**
`display: none` removes the element from the layout entirely, so others fill its space. `visibility: hidden` hides it but keeps its space. Neither is clickable or read by screen readers.

**Q: `visibility: hidden` vs `opacity: 0`?**
Both keep the space, but an `opacity: 0` element is still clickable, focusable and read by screen readers, while a `visibility: hidden` one isn't.

**Q: How do you hide content but keep it for screen readers?**
A visually-hidden (`.sr-only`) class: a 1px clipped, absolutely positioned element.

**Q: How do you fade an element out properly?**
Transition `opacity` together with `visibility`, so it's not clickable after fading.

**Q: Which is best for animation performance?**
`opacity` (and `transform`), which can run on the compositor without reflow or repaint.

---

## 🎯 Interview answer

> "`display: none` removes the element from the layout completely: no space, not visible, not focusable, and not read by screen readers, so surrounding content reflows. `visibility: hidden` hides it but keeps its space, and it's also not interactive or announced. `opacity: 0` just makes it transparent: the space stays, but it's still clickable, focusable and read by screen readers, which is a common accessibility bug. To fade something out I transition opacity together with visibility, so it stops receiving clicks once hidden, since display can't normally be transitioned. To hide something visually but keep it for screen readers, like a label on an icon button, I use a visually-hidden `.sr-only` class, and `aria-hidden` for the opposite. Performance-wise, display changes trigger layout, visibility only repaint, and opacity can be composited on the GPU."
