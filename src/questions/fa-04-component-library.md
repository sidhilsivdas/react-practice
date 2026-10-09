## 📄 Original answer (PDF)

**Question:** How do you design an enterprise-grade Component Library that scales across multiple products without becoming bloated?

**Answer:** I advocate for a headless UI approach (like Radix UI or React Aria) combined with a highly constrained styling system (like Tailwind or standard CSS modules). The library should provide unstyled accessibility/logic primitives, which are then composed into styled components.

**Real-time example:** Building an `` *(component name is blank in the PDF, likely `<Autocomplete>` / `<Combobox>`)* component that handles all keyboard navigation and ARIA attributes internally, but accepts `renderInput` and `renderOption` props so different teams can style it to fit their specific product's design language.

---

## 💡 Layered architecture

```
Layer 3: Product components     ProductCard, CheckoutSummary          (owned by product teams)
Layer 2: Styled components      Button, Select, Dialog, Combobox      (the design system, themed)
Layer 1: Headless primitives    Radix / React Aria / Ark UI            (behaviour, ARIA, keyboard, focus)
Layer 0: Design tokens          colours, spacing, type, radii → CSS variables
```

```tsx
// Layer 2: a styled Select built on a headless primitive
import * as SelectPrimitive from '@radix-ui/react-select'
import { cva, type VariantProps } from 'class-variance-authority'

const trigger = cva('inline-flex items-center rounded-md border px-3', {
  variants: { size: { sm: 'h-8 text-sm', md: 'h-10' }, invalid: { true: 'border-red-600' } },
  defaultVariants: { size: 'md' },
})

type SelectProps = { label: string; options: { value: string; label: string }[] } & VariantProps<typeof trigger>

export function Select({ label, options, size, invalid }: SelectProps) {   // label is REQUIRED (accessibility)
  const id = useId()
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <SelectPrimitive.Root>
        <SelectPrimitive.Trigger id={id} className={trigger({ size, invalid })} />
        {/* content/items… keyboard and ARIA handled by the primitive */}
      </SelectPrimitive.Root>
    </>
  )
}
```

---

## 💡 Flexible APIs without bloat

| Technique | Example |
|---|---|
| **Composition / compound components** | `<Dialog><Dialog.Trigger/><Dialog.Content/></Dialog>` instead of 20 props |
| **`asChild` / polymorphic `as`** | `<Button asChild><Link href="/x">Go</Link></Button>`: the styles go onto the link |
| **Slots / render props** | `renderOption={(o) => <ProductOption {...o} />}` (as in the PDF example) |
| **Variants, not booleans** | `variant="primary" \| "secondary"` (cva), not `isPrimary isLarge isRounded…` |
| **Hooks for logic** | `useCombobox()` exported for fully custom UIs |
| **Escape hatches** | Forward `className`, `ref` (a prop in React 19), and rest props |

---

## 💡 Keeping it lean

- **Tree-shakeable ESM output**, one entry per component (`@acme/ui/button`), and `"sideEffects": ["*.css"]`.
- **No heavy dependencies inside** (no moment or lodash). Peer dependencies for `react` and `react-dom`.
- **Size budgets in CI** (size-limit) for each component.
- **A contribution model:** new components are proposed via an RFC; product-specific widgets stay in product code until they're used in at least 3 places.
- **Deprecation policy:** mark components deprecated, provide codemods, and remove them in the next major version.

---

## 💡 Quality & governance

- **Storybook** as the documentation and the visual test bed; **visual regression** (Chromatic or Playwright screenshots).
- **Accessibility tests** (axe) for every component story, plus keyboard and screen-reader checks.
- **Semver + Changesets** with changelogs; a beta channel for big changes.
- **Theming through CSS variables (tokens)**, so products re-brand without forking components.
- **Usage analytics:** track which components and props are used, to guide deprecations.
- **A design-system team** with office hours, shared ownership with product teams, and Figma parity.

---

## 🎯 Interview answer

> "I layer it: design tokens as CSS variables at the bottom, headless primitives like Radix or React Aria for behaviour, keyboard and ARIA, then a thin styled layer with a constrained variant system like Tailwind with cva or CSS modules, and product-specific components stay in the product codebases. APIs favour composition: compound components, `asChild` or polymorphic rendering, render props or slots like `renderOption` for flexible lists, and variant props instead of piles of booleans, with hooks exported for fully custom cases. To avoid bloat, the output is tree-shakeable ESM per component with `sideEffects` declared, React as a peer dependency, no heavy internal dependencies, and size budgets in CI; new components go through an RFC and stay in product code until they're widely reused. Quality comes from Storybook docs, visual regression and axe tests on every story, semver with Changesets and codemods for breaking changes, and theming through tokens so products re-brand without forking."
