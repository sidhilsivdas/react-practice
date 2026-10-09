## Short answer

**Accessibility (a11y) means everyone can use your site**, including people who:

- **are blind** (screen readers)
- **can't use a mouse** (keyboard only)
- **have low vision** (zoom, high contrast)
- **are colour-blind, deaf, or have motor or cognitive disabilities**

**The big wins:**

1. **Semantic HTML:** real `button`, `a`, `label`, headings and landmarks.
2. **Text alternatives:** `alt` on images, labels on inputs.
3. **Keyboard support:** everything works with Tab, Enter, Space and Esc, with a **visible focus**.
4. **Colour contrast:** text readable against its background (WCAG: 4.5:1 for normal text).
5. **ARIA only when HTML can't do it.**

**Analogy: a building with ramps and lifts** ♿ Stairs work for many people, but ramps, lifts and braille signs mean **everyone** can get in. Accessible HTML is the ramp, and it helps everyone (like a ramp helps people with prams too).

---

## Images & alt text

```html
<img src="sam.jpg" alt="Sam smiling, holding a trophy" />   <!-- ✅ describes the meaning -->
<img src="divider.png" alt="" />                            <!-- ✅ decorative: empty alt, so it's skipped -->
<img src="chart.png" />                                     <!-- ❌ missing alt: reader may read the file name -->
```

- **Describe what the image means**, not "image of...".
- **Icon-only buttons need a text label:**

```html
<button aria-label="Close dialog">✕</button>
```

---

## Forms

```html
<!-- ✅ the label is linked to the input: clicking it focuses the input, and readers announce it -->
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email" required aria-describedby="email-hint" />
<p id="email-hint">We'll never share your email.</p>

<!-- ❌ a placeholder is NOT a label (it disappears while typing, and has poor contrast) -->
<input placeholder="Email" />
```

**Error messages should be announced:**

```html
<input id="email" aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" role="alert">Please enter a valid email.</p>
```

---

## Keyboard

- **Native elements work automatically:** `<button>`, `<a href>`, `<input>` are focusable and respond to Enter and Space.
- **`<div onclick>` doesn't.** It isn't focusable and has no role. Use a `<button>`.
- **Never remove the focus outline without a replacement:**

```css
button:focus { outline: none; }                                 /* ❌ keyboard users get lost */
button:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }   /* ✅ visible for keyboard users */
```

| `tabindex` | Meaning |
|---|---|
| `0` | Can receive focus, in normal order |
| `-1` | Focusable from JavaScript only (e.g. moving focus into a dialog) |
| `1+` | ❌ avoid: it messes up the natural tab order |

**Also:** add a "**Skip to main content**" link at the top, keep focus **inside open modals**, and move focus back to the trigger when they close.

---

## ARIA

**ARIA attributes add roles, states and labels for assistive technology**, when HTML alone can't express it.

**The first rule of ARIA: don't use ARIA if a native element does the job.** `<button>` beats `<div role="button" tabindex="0">` plus your own key handling.

```html
<!-- a toggle button's state -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" hidden>...</ul>

<!-- live region: announce updates without moving focus -->
<div aria-live="polite">3 items added to cart</div>

<!-- landmark label when there are several navs -->
<nav aria-label="Footer">...</nav>
```

| Attribute | Purpose |
|---|---|
| `aria-label` | Text label when no visible text exists |
| `aria-labelledby` / `aria-describedby` | Point to another element's text as the label or description |
| `aria-expanded`, `aria-checked`, `aria-selected` | States |
| `aria-hidden="true"` | Hide decorative things from screen readers (never on focusable elements) |
| `aria-live` | Announce dynamic changes |
| `role` | Define what a custom widget is (`dialog`, `tablist`, `alert`) |

---

## Visual

- **Contrast:** at least **4.5:1** for normal text, 3:1 for large text (WCAG AA).
- **Don't rely on colour alone:** "fields in red are required" fails for colour-blind users. Add an icon or text.
- **Text must zoom to 200%** without breaking. Use `rem` and flexible layouts.
- **Respect motion preferences:**

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## Testing

- **Keyboard only:** unplug the mouse and Tab through the page.
- **Screen reader:** NVDA (Windows), VoiceOver (Mac/iOS), TalkBack (Android).
- **Automated tools:** Lighthouse, axe DevTools, `eslint-plugin-jsx-a11y` for React. They catch around a third of issues, so manual testing is still needed.

---

## Quick Q&A

**Q: What is web accessibility?**
Building sites usable by people with disabilities: screen reader users, keyboard-only users, low vision, colour blindness and more, following WCAG guidelines.

**Q: When should you use ARIA?**
Only when native HTML can't express it, for custom widgets, live regions and states. Native elements come first.

**Q: Why is `<div onclick>` bad?**
It's not focusable, has no role, and doesn't respond to Enter or Space, so keyboard and screen reader users can't use it. Use `<button>`.

**Q: What makes good alt text?**
A short description of the image's meaning in context; `alt=""` for decorative images.

**Q: What is WCAG?**
The Web Content Accessibility Guidelines. Level AA is the usual target, including 4.5:1 contrast for normal text.

---

## 🎯 Interview answer

> "Accessibility means making the site usable for everyone, including screen reader users, keyboard-only users, and people with low vision or colour blindness, usually targeting WCAG AA. Most of it comes from semantic HTML: real buttons and links, labels connected to inputs, a logical heading structure and landmarks like nav and main, and meaningful alt text, or an empty alt for decorative images. Everything must be keyboard-operable with a visible focus style, using `:focus-visible` rather than removing outlines, and modals should trap focus and return it on close. I only use ARIA when native HTML can't express something, like `aria-expanded` on a toggle, `aria-live` for announcements, or `aria-label` on icon-only buttons. I check colour contrast, don't rely on colour alone, and respect `prefers-reduced-motion`, and I test with the keyboard, a screen reader, and tools like axe and Lighthouse."
