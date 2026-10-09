## What the JD says

> "**Establish coding standards, best practices, and perform code reviews**" · "following established architecture and coding standards"

---

## What it means

**Coding standards** are the team's agreed rules for how code is written, so that **everyone's code looks and works the same way**.

**As the architect you:**

1. **Define them:** style, structure, naming, TypeScript rules, testing expectations.
2. **Automate them:** tools enforce the rules, so humans don't argue about commas.
3. **Review against them:** code reviews focus on design, correctness and risk.
4. **Evolve them:** standards change through discussion (RFCs and ADRs), not decree.

**Analogy: traffic rules** 🚦 Everyone drives on the same side and stops at red. That's not to restrict drivers but so thousands of them can move safely and quickly together.

---

## What they expect

- **A concrete toolchain:** TypeScript strict, ESLint (with React, hooks and accessibility rules), Prettier, git hooks, CI gates.
- **Written conventions:** naming, folder structure, component patterns, error handling, testing.
- **A healthy review culture:** fast, respectful, focused on what matters, with clear checklists.
- **Measurable quality:** test coverage of critical paths, bundle size budgets, accessibility checks, few production bugs.
- **Leading by example:** your own pull requests are small, tested and well described.

---

## Automate everything

| Tool | Enforces |
|---|---|
| **TypeScript** (`strict: true`) | Type safety; no implicit `any`; null checks |
| **ESLint** | Bugs and best practices: `react-hooks` rules, `jsx-a11y`, import order and boundaries, no unused variables, no `console` |
| **Prettier** | Formatting (no style debates in reviews) |
| **husky + lint-staged** | Lint and format staged files before each commit |
| **commitlint** | Commit message format (Conventional Commits: `feat:`, `fix:`, `chore:`) |
| **CI pipeline** | Lint, typecheck, tests, build, bundle-size and Lighthouse checks; **merge blocked if they fail** |
| **Dependabot / Renovate** | Dependencies kept up to date |
| **Storybook + visual tests** | UI consistency (Chromatic / Playwright screenshots) |

```js
// eslint.config.js (flat config, ESLint 9)
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  react.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,       // rules of hooks + exhaustive deps
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react/react-in-jsx-scope': 'off',
    },
  }
)
```

```json
// tsconfig.json (key options)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## Written conventions

**Keep a short `CONTRIBUTING.md` / "How we build" doc:**

| Topic | Example rule |
|---|---|
| Naming | Components `PascalCase.tsx`, hooks `useThing.ts`, constants `UPPER_SNAKE`, booleans `isX/hasX` |
| Structure | Feature folders; import other features only through their `index.ts` |
| Components | Function components; props typed; server components by default; `'use client'` only at the leaves |
| State | Colocate; server data via server components or TanStack Query; filters in the URL |
| Styling | Design tokens only; no inline magic numbers |
| Errors | Typed API errors; error boundary per route; never swallow errors silently |
| Accessibility | Semantic HTML first; every interactive element keyboard-usable; labels on all inputs |
| Testing | Unit for logic, component tests for UI, Playwright for critical journeys |
| Git | Small PRs (<400 lines), Conventional Commits, branch naming `feat/cart-merge` |
| Performance | No new dependency over 20 KB gzip without discussion; images via `next/image` |

---

## Code reviews

### Purpose

**Not "find someone's mistakes".** Code reviews exist to:

1. **Catch bugs and risks early.**
2. **Keep the architecture consistent.**
3. **Share knowledge** (at least two people understand every change).
4. **Mentor.**

### Review checklist

| Area | Ask |
|---|---|
| **Correctness** | Does it meet the acceptance criteria? Edge cases, errors, empty and loading states? |
| **Design** | Right place in the architecture? Reuses existing components and hooks? Simple enough? |
| **Readability** | Clear names? Small functions? Would a new team member understand it? |
| **Security** | No secrets in client code? Input validated? No `dangerouslySetInnerHTML` with untrusted data? |
| **Performance** | Unnecessary client components or re-renders? Large dependencies? Images optimised? |
| **Accessibility** | Semantic elements, labels, keyboard, focus, contrast? |
| **Tests** | Do tests cover the behaviour (not implementation details)? |
| **Observability** | Errors logged? Analytics events? |

### How to review well

- **Review quickly** (within a working day). Slow reviews kill flow.
- **Be specific and kind:** comment on the code, not the person, and explain **why**.
- **Label comments** so priority is clear:

```
blocking: This exposes the API key to the browser. Move the call to a server component.
suggestion: Could we reuse <PriceTag /> here instead of formatting manually?
question: What happens if `variants` is empty?
nit: Typo in the variable name (optional).
praise: Nice use of useOptimistic here, the UI feels instant.
```

- **Automate nitpicks.** If you comment on formatting, add a lint rule instead.
- **Big or risky change?** Talk or pair first instead of 50 comments.
- **Approve with minor comments** when the issues are small, to keep things moving.

### Pull request template

```md
## What & why
Adds size/colour filters to the category page (JIRA-1234).

## How
- Filters stored in URL params; server component fetches with facets
- New <SwatchList> in design system (Storybook updated)

## Screenshots / video
(before / after, mobile + desktop)

## Checklist
- [ ] Tests added (unit + Playwright for acceptance criteria)
- [ ] Accessibility checked (keyboard, screen reader, axe)
- [ ] No bundle-size or Core Web Vitals regression
- [ ] Feature flag: `plp-filters`
```

---

## Introducing standards

**People follow rules they helped create, and that tools make easy:**

1. **Start with pain points** ("we had 3 bugs from missing null checks") and propose a fix.
2. **Write a short RFC**, discuss it with the team, and record the decision in an ADR.
3. **Roll out gradually:** lint rule as a warning, then fix existing code, then make it an error (or `eslint --max-warnings`).
4. **Provide examples, templates and generators** (Plop, Nx generators) so the right way is the easy way.
5. **Review and adjust** every quarter. Delete rules that don't help.

---

## Measuring quality

- **Lead time and PR review time** (DORA metrics: deployment frequency, lead time, change failure rate, time to restore).
- **Production bugs per release**, and escaped defects.
- **Test reliability** (flaky test rate).
- **Bundle size**, Core Web Vitals, and accessibility violations over time.
- **Developer satisfaction:** are standards helping or slowing people down?

---

## What to learn

- ✅ **TypeScript strict mode** and advanced types (generics, discriminated unions, `satisfies`).
- ✅ **ESLint flat config**, key plugins (react-hooks, jsx-a11y, import, boundaries), and writing a custom rule.
- ✅ **Prettier, husky, lint-staged, commitlint**, Conventional Commits.
- ✅ **CI pipelines** (GitHub Actions / Azure DevOps / GitLab CI) with quality gates.
- ✅ **Code review best practices**, comment labels, PR templates.
- ✅ **RFCs and ADRs** for evolving standards.
- ✅ **DORA metrics** and quality measurement.

---

## Interview questions

**Q: How do you establish coding standards in a new team?**
Agree them together, starting from real pain points; automate as much as possible (TypeScript, ESLint, Prettier, hooks, CI gates); document the rest briefly with examples; and evolve them through RFCs and ADRs.

**Q: What do you look for in a code review?**
Correctness and edge cases, fit with the architecture, readability, security, performance, accessibility and tests. Formatting is left to tools.

**Q: How do you handle disagreements in code reviews?**
Focus on the reasoning and on our standards, not opinions; move to a quick call if the thread grows; if it's a matter of taste, approve. If it's a recurring debate, decide it once in an ADR.

**Q: A senior developer keeps ignoring the standards. What do you do?**
Talk one-to-one to understand why (maybe the rule is wrong), explain the impact, involve them in improving the standard, and let automation enforce it consistently.

---

## 🎯 Interview answer

> "I establish standards with the team rather than for them: we start from real problems, agree conventions in a short RFC and record them in ADRs. Then I automate as much as possible, with TypeScript in strict mode, ESLint flat config including react-hooks, jsx-a11y and import boundary rules, Prettier, husky with lint-staged for pre-commit checks, Conventional Commits, and a CI pipeline that blocks merges on lint, type, test, bundle-size and Lighthouse failures. What tools can't check goes into a short 'how we build' guide with examples and generators, so the right way is the easy way. Code reviews then focus on correctness, edge cases, architecture fit, security, performance, accessibility and tests; I keep PRs small, review within a day, label comments as blocking, suggestion or nit, explain the why, and use reviews to mentor. I track things like review time, escaped bugs, flaky tests and Core Web Vitals to see whether the standards are actually helping."
