## What the JD says

> "Optimize applications for performance, **accessibility**, and scalability" · "deliver **high-quality user experiences**"

---

## What it means

**For an architect, accessibility (a11y) isn't "add alt text".** It means designing the **system** so that **every page the team ships** is usable by people with disabilities:

- **A target standard:** **WCAG 2.2 Level AA**.
- **An accessible design system:** components accessible by default.
- **Automated checks in CI.**
- **Manual testing routines.**
- **Team training and ownership.**

**It's also a legal requirement:**

- **EU:** the **European Accessibility Act (EAA)** has applied to e-commerce sold to EU consumers since **28 June 2025**. It's enforced through EN 301 549, which maps to WCAG AA.
- **US:** the ADA, with frequent lawsuits against shops.
- **India:** the RPwD Act and GIGW guidelines for government work.
- **Accenture's clients are big brands**, so this comes up.

**Analogy: building codes** 🏢 You don't add ramps after the building opens. The architect designs entrances, lifts and signage in from the first drawing, and inspectors check them.

---

## What they expect

- **Know WCAG's POUR principles** and the AA criteria that matter most for shops.
- **Build accessibility into the design system**, so teams get it for free.
- **Automate what can be automated** (axe in unit tests, Playwright and CI) and **know its limits** (about 30–40% of issues).
- **Manual testing:** keyboard and screen readers (NVDA, VoiceOver).
- **Handle the hard parts of e-commerce:** filters, carousels, modals, mega menus, carts, checkout forms, error messages.
- **Make it a process:** Definition of Done, audits, training, a bug priority policy.

---

## WCAG 2.2 basics

**POUR:** content must be **P**erceivable, **O**perable, **U**nderstandable, **R**obust.

| Principle | Key requirements (AA) | E-commerce examples |
|---|---|---|
| **Perceivable** | Text alternatives; contrast **4.5:1** for normal text, 3:1 for large text and UI parts; content reflows at 320px / 400% zoom; captions | Product image alt text, price contrast, sale badges not by colour alone |
| **Operable** | Everything works with a keyboard; no keyboard traps; **visible focus**; skip links; enough time; **target size ≥ 24×24px** (new in 2.2); focus not hidden behind sticky headers (new in 2.2) | Mega menu, filters, image zoom, carousel controls, sticky "Add to cart" bar |
| **Understandable** | Labels and instructions; clear error messages with suggestions; consistent navigation; **don't re-ask for information already entered** (new in 2.2) | Checkout forms, address validation, coupon errors |
| **Robust** | Valid, semantic HTML; correct name, role and value for custom widgets; status messages announced | Custom select, quantity stepper, "Added to cart" toast |

**WCAG 2.2 (October 2023) added**, among others:

- **Focus not obscured.**
- **Dragging movements** (provide a non-drag alternative).
- **Target size (minimum).**
- **Consistent help.**
- **Redundant entry.**
- **Accessible authentication** (no cognitive tests like solving puzzles to log in; allow password managers and paste).

---

## Accessible design system

**The most effective architect move: make the accessible way the default way.**

```tsx
// ❌ every team builds its own dropdown: keyboard support, ARIA and focus differ (or are missing)
// ✅ one Select in the design system, built on a proven headless primitive

import * as SelectPrimitive from '@radix-ui/react-select'   // or React Aria / Ark UI

export function Select({ label, options, ...props }: SelectProps) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id}>{label}</label>                 {/* label is required by the API */}
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger id={id}>…</SelectPrimitive.Trigger>
        {/* keyboard nav, ARIA roles, focus management: handled by the primitive */}
      </SelectPrimitive.Root>
    </div>
  )
}
```

**Design-system rules:**

- **Required accessible props in the TypeScript types:** `label` on inputs, `alt` on images, `aria-label` on icon buttons.
- **Tokens meet contrast**, so a designer can't pick a failing text colour from the palette.
- **Focus ring styles** with `:focus-visible` on every component.
- **Motion respects `prefers-reduced-motion`.**
- **Each Storybook story has an accessibility check** (the a11y addon).

---

## Hard e-commerce parts

| Component | Must do |
|---|---|
| **Mega menu** | Disclosure buttons (`aria-expanded`), Esc closes it, keyboard reachable, not hover-only |
| **Filters** | Real checkboxes or radios in a `fieldset` + `legend`; announce result counts (`aria-live="polite"`); the mobile filter drawer traps focus and returns it on close |
| **Product images / carousel** | Meaningful alt text; pause button for auto-rotation (or no auto-rotation); prev/next buttons labelled; swipe has a button alternative |
| **Variant picker** (size/colour) | Radio group semantics; colour swatches have text names; unavailable sizes announced as "unavailable", not just greyed out |
| **Add to cart** | Status message announced ("Added to cart, 3 items"); mini-cart dialog manages focus |
| **Modals / drawers** | Focus moves in, is trapped, and returns to the trigger; Esc closes; background inert (`inert` attribute or `<dialog>`) |
| **Checkout forms** | Visible labels; `autocomplete` attributes (`address-line1`, `cc-number`…); errors linked with `aria-describedby`; an error summary that receives focus; no timeouts without warning |
| **Price** | Sale vs original price clear to screen readers ("Was £50, now £35"), not just a strikethrough |

```tsx
// announce cart updates without moving focus
<div role="status" aria-live="polite" className="sr-only">
  {lastAdded && `${lastAdded.name} added to cart. Cart has ${count} items.`}
</div>
```

---

## Testing strategy

| Level | Tool | Catches |
|---|---|---|
| **Lint** | `eslint-plugin-jsx-a11y` | Missing alt, labels, invalid ARIA in JSX |
| **Component tests** | Testing Library (`getByRole` queries) + `jest-axe` / `vitest-axe` | Wrong roles, missing names, violations per component |
| **Storybook** | a11y addon | Violations while building components |
| **E2E** | **Playwright + `@axe-core/playwright`**, ARIA snapshots | Full-page violations on key journeys |
| **CI** | Lighthouse CI accessibility score, axe in Playwright | Blocks regressions |
| **Manual** ⭐ | **Keyboard-only** pass; **screen readers** (NVDA + Chrome, VoiceOver + Safari); 200–400% zoom; Windows high contrast | Focus order, meaning, real usability (automation can't judge these) |
| **Audits** | An expert audit before launch; usability testing with disabled users | Real-world issues |

```ts
// Playwright + axe: fail the test on WCAG A/AA violations
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('product page has no detectable a11y violations', async ({ page }) => {
  await page.goto('/products/demo-shoe')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
  expect(results.violations).toEqual([])
})
```

**Using `getByRole` in tests** is also good practice: if a test can't find the button by its role and name, a screen reader user can't either.

---

## Making it a process

1. **Target:** WCAG 2.2 AA in the Definition of Done.
2. **Shift left:** accessibility annotations in Figma designs (headings, focus order, labels), reviewed with UX.
3. **Prevent:** an accessible design system, lint rules, PR checklist items.
4. **Detect:** CI checks plus regular manual audits of the top journeys (browse → product → cart → checkout).
5. **Fix:** an accessibility bug severity policy (blocking issues on checkout = P1).
6. **Train:** a short workshop, a screen-reader demo for the team, and an "a11y champion" per squad.
7. **Document:** an accessibility statement page, and a VPAT/ACR if clients require it.

---

## What to learn

- ✅ **WCAG 2.2 AA:** POUR, contrast, keyboard, focus, target size, forms and errors, status messages; what changed in 2.2.
- ✅ **The legal landscape:** the European Accessibility Act (June 2025), ADA, EN 301 549.
- ✅ **Semantic HTML first; ARIA patterns** from the ARIA Authoring Practices Guide (dialog, menu, tabs, combobox, carousel).
- ✅ **Focus management** in SPAs: route changes, modals, toasts.
- ✅ **Headless accessible libraries:** Radix, React Aria, Ark UI.
- ✅ **Testing:** jsx-a11y, axe (jest-axe, Playwright), Storybook a11y addon, screen readers (NVDA, VoiceOver).
- ✅ **E-commerce widget patterns:** filters, variant pickers, carousels, checkout forms.

---

## Interview questions

**Q: How do you ensure accessibility across a large app and team?**
Target WCAG 2.2 AA; make the design system accessible by default (headless primitives, required labels, contrast-safe tokens, focus styles); automate checks (jsx-a11y, axe in component and Playwright tests, Lighthouse CI); do manual keyboard and screen-reader testing on key journeys; and train the team.

**Q: What does automated testing miss?**
Most issues that need judgement: meaningful alt text, logical focus order, understandable error messages, whether announcements make sense. Automation finds roughly a third.

**Q: How do you make a modal accessible?**
Use `<dialog>` or a proven primitive: move focus in, trap it, Esc closes, background inert, return focus to the trigger, labelled with `aria-labelledby`.

**Q: What's new in WCAG 2.2?**
Focus not obscured, target size minimum (24px), dragging alternatives, consistent help, redundant entry, and accessible authentication.

---

## 🎯 Interview answer

> "I treat accessibility as a system property, not a per-feature task, targeting WCAG 2.2 AA, which is also a legal requirement for e-commerce in the EU since the European Accessibility Act took effect in June 2025. The biggest lever is the design system: components built on accessible headless primitives like Radix or React Aria, TypeScript props that require labels and alt text, contrast-safe tokens, consistent `:focus-visible` styles and reduced-motion support, so teams are accessible by default. Then I automate detection with jsx-a11y linting, axe in component and Playwright tests, Storybook's a11y addon and Lighthouse CI, while knowing automation only catches about a third of issues, so we also do keyboard-only and screen-reader testing with NVDA and VoiceOver on key journeys. I pay special attention to the hard e-commerce parts: filters with fieldsets and announced result counts, variant pickers, carousels, focus-managed modals and drawers, cart status messages, and checkout forms with proper labels, autocomplete and linked error messages. Finally I make it a process, in the Definition of Done, design annotations, a bug severity policy and team training."
