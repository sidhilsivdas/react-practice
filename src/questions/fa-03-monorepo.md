## 📄 Original answer (PDF)

**Question:** Explain your approach to structuring a React Monorepo for a company with multiple consumer-facing and internal products.

**Answer:** I would use Turborepo or Nx to manage a single repository containing multiple applications (e.g., `apps/web`, `apps/admin`) and shared packages (e.g., `packages/ui-library`, `packages/utils`, `packages/eslint-config`).

**Real-time example:** Updating a core Button component in `packages/ui-library`. Turborepo's dependency graph detects the change and intelligently rebuilds only the dependent applications (`web` and `admin`), skipping the `marketing` site that doesn't use it.

---

## 💡 A typical layout

```
repo/
├── apps/
│   ├── web/              Next.js storefront (customers)
│   ├── admin/            internal back-office (Vite + React)
│   └── marketing/        static marketing site
├── packages/
│   ├── ui/               design system (Button, Modal…) + Storybook
│   ├── tokens/           design tokens (colours, spacing) → CSS variables
│   ├── api-client/       typed API client generated from OpenAPI
│   ├── utils/            formatting, validation (pure functions)
│   ├── eslint-config/    shared lint rules
│   └── tsconfig/         shared TypeScript configs
├── turbo.json            task pipeline + caching
├── pnpm-workspace.yaml   workspaces
└── package.json
```

```json
// turbo.json: tasks depend on their dependencies' tasks; outputs are cached
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

```bash
turbo run build --filter=...[origin/main]     # build only packages changed since main, plus what depends on them
```

---

## 💡 What makes it work

| Practice | Why |
|---|---|
| **pnpm workspaces** | Fast installs, strict dependencies (no "phantom" imports), one lock file |
| **Remote caching** (Vercel Remote Cache / Nx Cloud) | CI and teammates reuse build outputs, so builds take seconds instead of minutes |
| **Affected-only CI** | Test and build only what changed and its dependents |
| **Module boundaries** | Nx tags or ESLint rules: apps can import packages, but **packages can't import apps**, and the admin app can't import web-only code |
| **CODEOWNERS** | Each package has an owning team that reviews changes |
| **Versioning** | Internal packages use `workspace:*` (always latest); published packages use **Changesets** for semver and changelogs |
| **Consistent tooling** | Shared TypeScript, ESLint and Prettier configs as packages |
| **Generators** | `nx g` / `turbo gen` to scaffold new packages the standard way |

---

## 💡 Turborepo vs Nx

| | **Turborepo** | **Nx** |
|---|---|---|
| Philosophy | Lightweight task runner + caching on top of your workspace | Full build system: plugins, generators, a project graph, boundary rules |
| Learning curve | Low | Higher |
| Best for | JS/TS monorepos that want speed with little setup | Large enterprises that need conventions, boundaries, generators, and polyglot support |

**Monorepo vs polyrepo:** a monorepo gives atomic cross-package changes, one version of each tool, and easy sharing. The costs are tooling and CI scale, plus access control, since everyone sees all the code.

---

## 🎯 Interview answer

> "I'd use a pnpm-workspace monorepo with Turborepo, or Nx for bigger organisations that want generators and enforced boundaries. Apps like web, admin and marketing live under `apps/`, and shared code under `packages/`: the design system with Storybook, design tokens, a typed API client generated from OpenAPI, utilities, and shared ESLint and TypeScript configs. The task pipeline declares that builds depend on their dependencies' builds, outputs are cached locally and remotely, and CI runs only affected projects, so changing the Button rebuilds web and admin but not marketing. I enforce module boundaries so packages never import apps and teams don't reach into each other's internals, use CODEOWNERS for ownership, internal packages via `workspace:*`, and Changesets if anything is published. The trade-off versus polyrepos is tooling and CI scale in exchange for atomic changes, consistent tooling and easy sharing."
