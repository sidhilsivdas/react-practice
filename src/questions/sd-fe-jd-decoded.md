## Short answer

**The role is a React Architect** for **headless, API-driven e-commerce**. In plain words:

- **You own the front-end architecture**: how the React/Next.js app is structured, built, tested, deployed and kept fast.
- **You still write code**: React, Next.js, HTML5/CSS3, plus some Node.js services with Fastify.
- **You lead people**: set standards, review code, mentor the team, and work closely with product, UX, backend and DevOps.
- **You're measured on quality**: performance (Core Web Vitals), accessibility, scalability, and tests (Playwright).

**"Architect" means interviews go beyond "how does `useEffect` work".** Expect **"why did you choose this?"**, **"what are the trade-offs?"** and **"how would you design this for 10 teams and a million users?"**

---

## The JD, line by line

| JD bullet | What it really means | Where to study |
|---|---|---|
| **Lead React frontend development and define application architecture** | Decide folder structure, state management, data fetching, rendering strategy, design system, monorepo vs micro-frontends, and document the decisions | [Frontend architecture](#/q/sd-fe-architecture) |
| **React / Next.js … with command on HTML5/CSS3** | Expert-level Next.js (App Router, server components, SSR/SSG/ISR, caching) and solid semantic HTML and modern CSS | [Next.js & rendering](#/q/sd-fe-nextjs-rendering), HTML & CSS tab |
| **Headless, API-driven e-commerce platforms** | The frontend is separate from the commerce engine (commercetools, Shopify, SAP, Salesforce…) and talks to it through APIs | [Headless e-commerce](#/q/sd-fe-headless-commerce) |
| **Node.js / Fastify services, performance and scalability** | Build or extend backend services: a BFF (backend-for-frontend), API aggregation, caching | System Design → Backend → [Fastify](#/q/sd-be-fastify) |
| **Scalable, maintainable UI with modern React patterns** | Compound components, custom hooks, composition, server/client component split, state colocation | [Modern React patterns](#/q/sd-fe-react-patterns) |
| **Translate business and UX requirements into clean, performant code** | Turn a Figma design + user story into components, states, edge cases, APIs and tests | [Requirements → code](#/q/sd-fe-requirements-to-code) |
| **Coding standards, best practices, code reviews** | ESLint, Prettier, TypeScript, conventions, PR templates, review checklists, CI quality gates | [Coding standards & reviews](#/q/sd-fe-coding-standards) |
| **Mentor team members, technical guidance** | Grow juniors, run design reviews, unblock people, make decisions and explain them | [Mentoring & leadership](#/q/sd-fe-mentoring-leadership) |
| **Optimise for performance, accessibility, scalability (Core Web Vitals)** | Hit LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1; WCAG 2.2 AA; measure with real-user data | [Performance & CWV](#/q/sd-fe-performance-cwv), [Accessibility at scale](#/q/sd-fe-accessibility) |
| **Collaborate with backend, UX and DevOps** | API contracts, design tokens, CI/CD, environments, feature flags, monitoring | [Collaboration & DevOps](#/q/sd-fe-collaboration-devops) |
| **Playwright for end-to-end testing** | Write reliable E2E tests, run them in CI, and decide the testing strategy | React & JavaScript → [Playwright](#/q/playwright-e2e) |

**Then put it all together:** [Worked example: design a headless e-commerce storefront](#/q/sd-fe-design-ecommerce), using the [system design interview framework](#/q/sd-fe-interview-framework).

---

## What an architect is judged on

| A senior developer… | An architect also… |
|---|---|
| builds features well | **designs the system** the features live in |
| knows how a tool works | knows **when not** to use it, and the **trade-offs** |
| solves today's problem | plans for **scale**: more users, more teams, more features |
| follows standards | **creates** standards and gets the team to adopt them |
| asks for help when blocked | **unblocks others** and makes decisions under uncertainty |
| writes code | writes **decision records**, diagrams and guidelines too |

**In every answer, show:** the options → the trade-offs → your choice → how you'd measure it worked.

---

## Likely interview rounds

**Interview experiences shared online for Accenture front-end roles** mention these topics. Expect more depth for an architect position.

| Round | What they check | Prepare |
|---|---|---|
| **Technical 1: fundamentals** | JavaScript (closures, `this`, call/apply/bind, promises, event loop), React (hooks, lifecycle, Redux flow, Fiber, diffing, performance) | React & JavaScript tab: Questions + Coding |
| **Technical 2: architecture / system design** | "Walk me through your project's architecture", "design a storefront", rendering strategy, state, performance, scaling teams | This System Design section |
| **Hands-on** | Build a component, fix a bug, live coding (debounce, custom hook, a form), sometimes Node.js | Coding tab, Playground |
| **Managerial / client** | Leading teams, conflicts, estimations, code reviews, mentoring, working with clients and stakeholders | [Mentoring & leadership](#/q/sd-fe-mentoring-leadership) (STAR stories) |
| **HR** | Expectations, notice period, location | — |

**Common real questions reported:**

- **"Explain your project's architecture and a hard technical challenge you solved."**
- **"How do you manage complex side effects in custom hooks?"**
- **"How do you optimise a large component tree?"**
- **"How does React Fiber work? How does diffing decide what to update?"**
- **"Explain the Redux flow."**
- **"Promise vs Observable."**
- **"call, apply and bind."**

---

## 4-week study plan

| Week | Focus | Output (prove it) |
|---|---|---|
| **1. Foundations** | React internals, hooks, patterns, JS fundamentals, HTML/CSS | Re-read this site's React/JS and HTML/CSS tabs; solve the coding problems again from memory |
| **2. Next.js + architecture** | App Router, server components, caching, rendering strategies, folder structure, state management, monorepos | Build a mini Next.js storefront: product list (ISR), product page, cart (client state) |
| **3. Quality** | Core Web Vitals, accessibility (WCAG 2.2), Playwright, coding standards, CI/CD | Add Lighthouse CI, axe checks and 5 Playwright tests to the mini storefront; write an ESLint config and PR template |
| **4. Backend + leadership** | Fastify BFF, caching, API design; STAR stories; mock system-design interviews | A Fastify BFF in front of a fake commerce API; 6 STAR stories; 2 timed mock designs (storefront, search page) |

---

## Your story bank

**Prepare one real example (STAR: Situation, Task, Action, Result) for each:**

1. **An architecture decision** you made, and its trade-offs.
2. **A performance problem** you fixed (numbers before and after: LCP, bundle size).
3. **An accessibility issue** you found and fixed.
4. **A disagreement** with a designer, backend developer or stakeholder, and how you resolved it.
5. **Mentoring someone** who then improved.
6. **A production incident**: what broke, how you fixed it, and what you changed to prevent it.
7. **Introducing a standard** or tool (TypeScript, ESLint rules, tests) and getting the team to adopt it.
8. **Delivering under a tight deadline**, and how you managed the scope.

---

## 🎯 Interview answer

> **"Tell me about yourself / why this role?"**
>
> "I'm a front-end engineer focused on React and Next.js, and I've been moving into architecture: defining how apps are structured, how data is fetched and cached, and how we keep them fast and accessible. In my recent work I [one-line achievement with a number, like 'cut LCP from 4s to 1.8s' or 'set up the component library used by three teams']. I also contribute on the Node side, building backend-for-frontend services. What interests me here is headless commerce at scale: choosing the right rendering strategy per page, integrating commerce APIs cleanly, meeting Core Web Vitals and accessibility targets, and growing a team with good standards, reviews and Playwright-based testing."
