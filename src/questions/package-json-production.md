## Short answer

**`package.json` is the control centre of a React project.** In a production app, check that it has:

| Area | What to look for |
|---|---|
| **Safety** | `"private": true`, so the app can't be published to npm by accident |
| **Scripts** | `dev`, `build`, `preview`, `test`, `lint`, `format`, `typecheck`: the whole team and CI run the same commands |
| **Dependencies** | runtime libraries in `dependencies`, tools in `devDependencies`, sensible version ranges |
| **Reproducible installs** | a committed **lock file** + `npm ci` in CI + pinned **Node version** (`engines`, `.nvmrc`) and **package manager** (`packageManager`) |
| **Browser support** | `browserslist` (or Vite's `build.target`) |
| **Security** | `overrides` for vulnerable sub-dependencies, `npm audit` in CI |
| **Code quality hooks** | husky + lint-staged to lint and format before each commit |

**Analogy: a restaurant's recipe book** 📖 It lists the ingredients (dependencies), the suppliers and exact brands (lock file), the cooking steps (scripts), and the kitchen equipment required (Node version). Any chef who follows it gets the **same dish**.

> **Basics** like semver (`^` vs `~`), the lock file and `npm install` vs `npm ci` are covered in the **Node.js → npm, package.json & semver** question.

---

## This project's package.json

```json
{
  "name": "react-practice",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-markdown": "^10.1.0",
    "react-router": "^8.4.0",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.20",
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.1.2",
    "tailwindcss": "^4.3.3",
    "vite": "^8.3.3"
  }
}
```

**Good for a practice app. For a production app, you'd add tests, linting, a pinned Node version, git hooks and more.** Here's what that looks like.

---

## Production example

```json
{
  "name": "shop-web",
  "private": true,
  "version": "2.4.1",
  "type": "module",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=22 <23"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "analyze": "vite build --mode analyze",
    "prepare": "husky"
  },
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-router": "^8.4.0",
    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vite": "^8.3.3",
    "@vitejs/plugin-react": "^6.1.2",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@playwright/test": "^1.50.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,md,json}": ["prettier --write"]
  },
  "browserslist": ["> 0.5%", "last 2 versions", "not dead"],
  "overrides": {
    "some-vulnerable-sub-dependency": "^2.1.4"
  }
}
```

---

## Field by field

| Field | Why it matters in production |
|---|---|
| **`private: true`** | `npm publish` refuses to run, so internal code is never leaked to the public npm registry |
| `name` / `version` | Identify the app. Bump the version on releases, and show it in the UI or error reports to know which build a bug came from. |
| **`type: "module"`** | `.js` files are ES modules (`import`/`export`). Vite projects use this. |
| **`scripts`** | One standard command for each task, the same locally and in CI |
| **`engines`** | The supported Node version. Add `engine-strict=true` in `.npmrc` to enforce it. |
| **`packageManager`** | Pins npm, pnpm or yarn **and its version** (with Corepack), so nobody mixes lock files |
| **`dependencies`** | Code your app **runs**: React, the router, data fetching, validation |
| **`devDependencies`** | **Tools only**: bundler, TypeScript, tests, linters |
| **`browserslist`** | Which browsers to support. Used by Babel, Autoprefixer, `@vitejs/plugin-legacy` and others. |
| **`overrides`** | Force a safe version of a **sub-dependency** you don't control (yarn: `resolutions`, pnpm: `pnpm.overrides`) |
| `lint-staged` | Which checks run on **staged files** before each commit |
| `workspaces` | Monorepos: several packages (web app, shared UI library) in one repo |

---

## Dependencies vs devDependencies

**In a browser app (SPA), everything you import ends up bundled into the JavaScript files anyway**, so why separate them?

1. **Clarity:** anyone can see what the app actually uses at runtime.
2. **Faster, smaller installs** where tools aren't needed: `npm ci --omit=dev`.
3. **It matters a lot for server code:** SSR apps (Next.js) and Node servers install only `dependencies` in production Docker images.
4. **Security reviews:** vulnerabilities in runtime dependencies matter more than in dev tools.

**Rule:** if the **browser or server runs it**, it's a `dependency`. If it only **builds, tests or checks** the code, it's a `devDependency`.

---

## Scripts every app needs

| Script | Runs | Used by |
|---|---|---|
| `dev` | development server with hot reload | developers |
| `build` | production build (often after `tsc` type-checking) | CI/CD |
| `preview` | serve the **production build** locally, to test it before deploying | developers / QA |
| `test` | unit and component tests (Vitest / Jest + Testing Library) | CI |
| `test:e2e` | end-to-end browser tests (Playwright / Cypress) | CI |
| `lint` | ESLint (bugs, React hooks rules, accessibility) | CI + git hooks |
| `format:check` | Prettier formatting | CI |
| `typecheck` | TypeScript without building | CI |
| `prepare` | runs after `npm install`: sets up husky git hooks | automatic |

**`pre` and `post` scripts run automatically:** `prebuild` runs before `build`, and `postbuild` after it.

**A typical CI pipeline:**

```bash
npm ci                  # exact install from the lock file
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e        # against the built app
```

---

## Environment variables

**In Vite, only variables starting with `VITE_` are exposed to your code:**

```bash
# .env.production
VITE_API_URL=https://api.myshop.com
VITE_SENTRY_DSN=https://abc@sentry.io/1
DATABASE_PASSWORD=secret          # NOT exposed: no VITE_ prefix ✅
```

```js
fetch(`${import.meta.env.VITE_API_URL}/products`)
import.meta.env.MODE        // 'development' | 'production'
import.meta.env.PROD        // true in a production build
```

**⚠️ Everything with `VITE_` is baked into the JavaScript files, which anyone can read in the browser.** **Never put secrets there** (API secret keys, passwords). Secrets belong on a server.

| | Vite | Create React App / webpack |
|---|---|---|
| Prefix | `VITE_` | `REACT_APP_` |
| Read with | `import.meta.env.VITE_X` | `process.env.REACT_APP_X` |

---

## Production checklist

- ✅ **`"private": true`.**
- ✅ **The lock file is committed**, and **CI uses `npm ci`** (or `pnpm install --frozen-lockfile`).
- ✅ **The Node version is pinned:** `engines` + `.nvmrc`, matching CI and the Docker image.
- ✅ **`packageManager` is set**, so only one lock file type is used.
- ✅ **Scripts exist for build, test, lint, typecheck and format**, and run in CI.
- ✅ **Runtime libraries are in `dependencies`** and tools in `devDependencies`.
- ✅ **No unused dependencies** (check with `npx knip` or `npx depcheck`). Each one is extra size and attack surface.
- ✅ **`npm audit` and Dependabot or Renovate** keep packages patched, with `overrides` for urgent sub-dependency fixes.
- ✅ **No secrets in `VITE_` / `REACT_APP_` variables.**
- ✅ **Bundle size is watched:** a visualiser (`rollup-plugin-visualizer`) and lazy-loaded routes.
- ✅ **Git hooks** (husky + lint-staged) stop broken code being committed.
- ✅ **Caret ranges plus a lock file** for apps. Exact pins only where a library is known to break on minor versions.

---

## Library-only fields

**If you publish a package to npm (like a component library), extra fields matter:**

```json
{
  "name": "@myorg/ui",
  "version": "1.3.0",
  "exports": { ".": { "import": "./dist/index.js", "require": "./dist/index.cjs" } },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "sideEffects": ["*.css"],
  "peerDependencies": { "react": ">=18" }
}
```

| Field | Meaning |
|---|---|
| `exports` / `main` / `module` | Which file to load for ESM or CommonJS users |
| `types` | TypeScript type definitions |
| `files` | Only publish these files (not the source or tests) |
| **`sideEffects`** | Tells bundlers which files can be **tree-shaken** safely (CSS imports have side effects) |
| **`peerDependencies`** | "Use the app's React". This avoids two copies of React, which breaks hooks. |

---

## Quick Q&A

**Q: What does `"private": true` do?**
It prevents the package from being published to the npm registry by accident.

**Q: Why separate dependencies and devDependencies in a frontend app?**
Clarity, smaller installs with `--omit=dev`, faster CI and Docker builds, and it matters for SSR and Node code where only dependencies are installed in production.

**Q: How do you make installs reproducible?**
Commit the lock file, use `npm ci`, and pin the Node version (engines and .nvmrc) and package manager (packageManager field).

**Q: How do you force a safe version of a vulnerable sub-dependency?**
The `overrides` field (npm), `resolutions` (yarn) or `pnpm.overrides`.

**Q: Are `VITE_` environment variables secret?**
No. They're embedded in the client JavaScript and visible to anyone. Only put public configuration there.

**Q: What is `browserslist`?**
A shared list of target browsers used by tools like Babel, Autoprefixer and Vite's legacy plugin to decide what code and CSS to transform.

---

## 🎯 Interview answer

> "In a production React app I check that package.json has `private: true` so it can't be published by mistake, and clear scripts for dev, build, preview, test, lint, format and typecheck, which CI runs in the same way. Runtime libraries go in dependencies and tooling in devDependencies; even though a SPA bundles everything, it keeps things clear and matters for SSR and Docker builds. For reproducible installs I commit the lock file, use `npm ci` in CI, and pin the Node version with `engines` and `.nvmrc`, plus the package manager with the `packageManager` field. I set `browserslist` or Vite's build target for browser support, use `overrides` to patch vulnerable transitive dependencies alongside npm audit and Renovate, and add husky with lint-staged for pre-commit checks. I also remind the team that `VITE_` or `REACT_APP_` environment variables end up in the browser bundle, so they must never contain secrets. For libraries, `exports`, `peerDependencies`, `files` and `sideEffects` become important too."
