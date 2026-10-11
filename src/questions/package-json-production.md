## Short answer

**`package.json` is the control centre of a React project.** In a production app, check that it has:

| Area | What to look for |
|---|---|
| **Safety** | `"private": true`, so the app can't be published to npm by accident |
| **Scripts** | `dev`, `build`, `preview`, `test`, `lint`, `format`, `typecheck`: the whole team and CI run the same commands |
| **Dependencies** | Runtime libraries in `dependencies`, tools in `devDependencies`, sensible version ranges |
| **Reproducible installs** | A committed **lock file** + `npm ci` in CI + a pinned **Node version** (`engines` / `devEngines`, `.nvmrc`) and **package manager** (`packageManager`) |
| **Browser support** | `browserslist` (and Vite's `build.target`) |
| **Security** | `overrides` for vulnerable sub-dependencies, `npm audit` in CI |
| **Code quality hooks** | husky + lint-staged to lint and format before each commit |

**Analogy: a restaurant's recipe book** 📖 It lists the ingredients (dependencies), the suppliers and exact brands (lock file), the cooking steps (scripts), and the kitchen equipment required (Node version). Any chef who follows it gets the **same dish**.

> **Basics** like semver (`^` vs `~`), the lock file and `npm install` vs `npm ci` are also covered in the **Node.js → npm, package.json & semver** question.

---

## How scripts run

**Three things to know before reading any `scripts` line:**

**1. `npm run <name>` runs that line in a shell.** `npm run build` runs whatever is written in `"build"`.
- A few names have shortcuts without `run`: `npm test`, `npm start`. All others need `run`: `npm run lint`.

**2. npm adds `node_modules/.bin` to the `PATH`** while a script runs. That's why `"dev": "vite"` works even though `vite` isn't installed globally. It runs the copy in `node_modules/.bin/vite` that your project installed. (Verified: the first `PATH` entry inside a script is the project's `node_modules\.bin`.)

**3. Shell operators work:**

| Operator | Meaning | Example |
|---|---|---|
| `&&` | Run the next command **only if the previous one succeeded** (exit code 0) | `tsc -b && vite build`: no build if there are type errors |
| `\|\|` | Run the next command only if the previous one **failed** | Rare in scripts |
| `--` | Pass the following arguments **to the script's command** | `npm run test -- --coverage` runs `vitest run --coverage` |

**`pre` and `post` scripts run automatically.** With `prebuild`, `build` and `postbuild` defined, `npm run build` runs all three in order (verified with npm 11).

**JSON has no comments.** You can't write `// explanation` in package.json, so teams document scripts in the README. This page explains each line instead.

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

**Good for a practice app** (plain JavaScript, no tests). **For a production app, you'd add TypeScript, tests, linting, a pinned Node version, git hooks and more.** Here's what that looks like; every line is explained below.

---

## Production example

```json
{
  "name": "shop-web",
  "private": true,
  "version": "2.4.1",
  "type": "module",
  "packageManager": "npm@11.6.2",
  "engines": {
    "node": ">=24"
  },
  "devEngines": {
    "runtime": { "name": "node", "version": ">=24", "onFail": "error" },
    "packageManager": { "name": "npm", "version": ">=11", "onFail": "error" }
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
    "typecheck": "tsc --noEmit -p tsconfig.app.json",
    "analyze": "vite build --mode analyze",
    "prepare": "husky"
  },
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-router": "^8.4.0",
    "@tanstack/react-query": "^5.104.0",
    "zod": "^4.6.0"
  },
  "devDependencies": {
    "vite": "^8.3.4",
    "@vitejs/plugin-react": "^6.1.2",
    "typescript": "^7.0.2",
    "vitest": "^5.0.3",
    "@testing-library/react": "^16.3.0",
    "@playwright/test": "1.64.0",
    "eslint": "^10.12.0",
    "prettier": "^3.9.0",
    "husky": "^9.1.7",
    "lint-staged": "^17.6.0"
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

## Top-level fields explained

### `"name": "shop-web"`
- **What:** the package's name.
- **Rules:** lowercase, no spaces, URL-safe characters, at most 214 characters. Scoped names look like `@myorg/shop-web`.
- **Production use:** appears in logs, error reports and monorepo tooling (`npm run build -w shop-web`). For an app that's never published, it's mostly a label, but keep it meaningful.

### `"private": true`
- **What:** marks the package as **not publishable**.
- **Why:** if someone runs `npm publish` by mistake, npm refuses: `EPRIVATE: This package has been marked as private. Remove the 'private' field from the package.json to publish it.` Your company's source code is never leaked to the public npm registry.
- **Bonus:** npm stops warning about missing `description`, `repository` and `license` fields, which only matter for published packages.
- **Rule:** **always `true` for apps.** Only libraries you intend to publish leave it out.

### `"version": "2.4.1"`
- **What:** the version, in **semver** format: `MAJOR.MINOR.PATCH`.
  - **MAJOR (2):** breaking changes.
  - **MINOR (4):** new features, backwards compatible.
  - **PATCH (1):** bug fixes.
- **Production use:**
  - Bump it on each release (`npm version patch` → 2.4.2, and it creates a git tag).
  - Show it in the UI footer or "About" box, and send it to your error tracker (Sentry `release`), so you know **which build** a bug report came from.
  - Read it in Vite with `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`.
- Many apps use `0.0.0` and version their deployments by **git commit SHA** instead. Both are fine; be consistent.

### `"type": "module"`
- **What:** tells Node.js that **`.js` files are ES modules** (`import` / `export`), not CommonJS (`require` / `module.exports`).
- **Why it matters:** your **config files** are run by Node: `vite.config.js`, `eslint.config.js`, `playwright.config.js`. With `"type": "module"`, they can use `import`.
- **Escape hatches:** `.cjs` files are always CommonJS, and `.mjs` files are always ES modules, whatever `type` says.
- Without this field, Node treats `.js` as CommonJS (the old default), although current Node also detects ES module syntax automatically.
- **It doesn't affect browser code:** Vite bundles that either way.

### `"packageManager": "npm@11.6.2"`
- **What:** declares **which package manager and exact version** the project uses: `npm@…`, `pnpm@…` or `yarn@…`.
- **Why:** if one developer uses npm and another uses pnpm, you get **two different lock files** and different dependency trees ("works on my machine").
- **Who reads it:** **Corepack** (shipped with Node up to v24; installed separately on newer versions) can download and run exactly that version; pnpm and yarn also respect it. npm itself only enforces the package manager through `devEngines` (below).

### `"engines": { "node": ">=24" }`
- **What:** the **Node.js versions** the project supports.
- **Why:** a build that works on Node 24 may fail on Node 20 (new syntax, removed APIs, different defaults).
- **Enforcement:** npm only **warns** by default (verified: `npm warn EBADENGINE Unsupported engine`). To make it a hard error, add `engine-strict=true` to `.npmrc`.
- **Also pin it in:** `.nvmrc` (for nvm or fnm users: `24`), CI (`actions/setup-node` with `node-version-file: .nvmrc`), and the Docker image (`FROM node:24-alpine`). **All of these should match.**
- For **published libraries**, `engines` tells users which Node versions are supported.

### `"devEngines": { … }`
- **What:** a newer field (npm 10.9+) describing the **development environment**: `runtime` (Node) and `packageManager` (npm).
- **`"onFail": "error"`** makes `npm install` **stop** in the wrong environment. Verified with npm 11: `npm error EBADDEVENGINES … Invalid semver version ">=99" does not match "v24.13.0" for "runtime"`. Other values are `"warn"` and `"ignore"`.
- **Difference from `engines`:** `engines` describes where the package **runs** (and is shown to people who install a library); `devEngines` describes where it's **developed**, and is stricter.

---

## Scripts explained

### `"dev": "vite"`
- **Runs** the Vite **development server** (default http://localhost:5173).
- **What it does:**
  - Serves your source files as native ES modules, without bundling them.
  - **Hot Module Replacement (HMR):** an edited component updates in the browser without a full reload, and keeps its state.
  - Loads `.env`, `.env.local` and `.env.development`.
- **Useful flags:** `vite --port 3000`, `vite --host` (opens it on your network, e.g. for testing on a phone), `vite --open`.
- **Never use it in production.** It's unoptimised and not hardened.

### `"build": "tsc -b && vite build"`
**Two commands joined by `&&`:** the build only runs if type-checking passes.

**`tsc -b`:**
- `tsc` is the **TypeScript compiler**. `-b` (`--build`) is **build mode**: it follows the **project references** in `tsconfig.json`, checks each project in the right order, and is **incremental**. It saves results in a `.tsbuildinfo` file, so the next run only re-checks what changed.
- The Vite React TypeScript template splits configs into `tsconfig.app.json` (your `src` code) and `tsconfig.node.json` (`vite.config.ts`). The root `tsconfig.json` only lists them as `references`, which is why it needs `-b`.
- Those configs set `"noEmit": true`, so `tsc -b` only **checks**; it doesn't write JavaScript files.
- **If there's a type error,** `tsc` exits with code 1, `&&` stops, and **no broken build is produced**.

**`vite build`:**
- Creates the **production bundle** in `dist/`. Vite uses **Rolldown** (Vite 8) to bundle, tree-shake and minify the JavaScript and CSS, add **content hashes** to filenames (`index-3f9a1c.js`, for long-term caching), split code into chunks, and copy `public/`.
- It loads `.env.production` and sets `import.meta.env.PROD = true`.
- **Important:** `vite build` **doesn't type-check**. It only strips the types. That's why `tsc` runs first.

### `"preview": "vite preview"`
- **Serves the `dist/` folder** locally (default http://localhost:4173), so you can **test the real production build** before deploying it: minified code, production environment variables, chunking, lazy routes.
- Run `npm run build` first.
- It's a **preview tool, not a production server**. In production, serve `dist/` from a CDN, Nginx, Netlify, Vercel, S3 + CloudFront, and so on.

### `"test": "vitest run"`
- **Vitest** is a fast test runner built on Vite (it reuses your Vite config, aliases and plugins) with a Jest-compatible API (`describe`, `it`, `expect`, `vi.fn()`).
- **`run`** means **run all tests once and exit**, with **no watch mode**. The exit code is 0 if all pass and 1 if any fail, which is exactly what CI needs.
- Used with **Testing Library** (`@testing-library/react`) to render components and test them the way users use them.
- **Common extras:** `vitest run --coverage` (code coverage report), `vitest run src/cart` (only tests in that folder).

### `"test:watch": "vitest"`
- `vitest` **without `run`** starts **watch mode** in an interactive terminal: it re-runs **only the tests affected** by the file you just saved. Use it while developing.
- In CI (when the `CI` environment variable is set) or a non-interactive terminal, plain `vitest` runs once automatically. Using `run` explicitly in `test` makes the intent clear.
- **The `:` in the name is just a naming convention** to group related scripts (`test`, `test:watch`, `test:e2e`). npm doesn't treat it specially.

### `"test:e2e": "playwright test"`
- **Playwright** runs **end-to-end tests** in real browsers (Chromium, Firefox, WebKit): it clicks, types and navigates like a user through the whole app (frontend + API).
- `playwright test` finds the test files (by default in `tests/` or as set in `playwright.config.ts`), runs them in parallel, and writes an HTML report.
- **Its config can start the app first** (`webServer: { command: 'npm run preview' }`), so the tests run against the real production build.
- **Useful flags:** `--ui` (interactive mode), `--headed` (watch the browser), `--project=chromium`, `--grep @smoke`.
- **First install:** `npx playwright install --with-deps` downloads the browsers.
- **Why `@playwright/test` is pinned exactly** (`1.64.0`, no `^`): each Playwright version expects specific browser builds, so teams pin it and upgrade deliberately.

### `"lint": "eslint ."`
- **ESLint** analyses your code for **bugs and bad patterns** without running it: unused variables, missing `useEffect` dependencies (`react-hooks/exhaustive-deps`), breaking the Rules of Hooks, accessibility problems (`jsx-a11y`), and forgotten `await` (typescript-eslint).
- **`.`** means **"this folder and everything inside it"**. Which files are linted, and with which rules, comes from **`eslint.config.js`** (the "flat config" format, the only one current ESLint supports). Ignored folders like `dist` are listed there.
- **Exit code 1** if there are **errors**, which fails CI. Warnings alone don't fail it, unless you add **`--max-warnings 0`** (a common strict CI setting).
- **Useful flags:** `eslint . --fix` auto-fixes what it can; `--cache` re-lints only changed files (faster).

### `"format": "prettier --write ."`
- **Prettier** is an opinionated **code formatter**: indentation, quotes, semicolons, line length and trailing commas, all formatted the same way for everyone. It ends style arguments in code reviews.
- **`--write`** means **rewrite the files in place** with the correct formatting.
- **`.`** means all supported files in this folder and below. Files listed in `.prettierignore` (and, by default, `.gitignore`) are skipped. The options come from `.prettierrc` or `prettier.config.js`.
- **Run it locally**, not in CI. CI should never change your files.

### `"format:check": "prettier --check ."`
- **`--check`** means **don't change anything; just report** which files aren't formatted.
- **Exit code 1** if any file isn't formatted, which fails the CI pipeline. The developer runs `npm run format` and commits again.
- **`--write` vs `--check`:** `--write` **fixes** (local, git hooks); `--check` **verifies** (CI).

### `"typecheck": "tsc --noEmit -p tsconfig.app.json"`
**This answers "what is `tsc --noEmit` for?"**

- **What `tsc` normally does:** two jobs. (1) **Check** the types, and (2) **emit** (write) JavaScript output files (`.js`, plus `.d.ts` declarations and source maps if configured).
- **`--noEmit`** means **"do job 1 only: check the types, but don't write any output files"**.
- **Why we don't want output:** in a Vite app, **Vite** produces the JavaScript. If `tsc` also wrote `.js` files, you'd get useless duplicate files next to your source (or in an `outDir`). We only want TypeScript as a **type checker**.
- **What it gives you:** a fast "is my whole project type-correct?" check, with an exit code of 0 (no errors) or 1 (errors). It's used in **CI** and **pre-push hooks**, and while refactoring.
- **Why a separate script when `build` already runs `tsc -b`?** CI can run `lint`, `typecheck` and `test` as separate, parallel steps, with clear failure messages. Developers can also check types without waiting for a full production build.

**`-p tsconfig.app.json`** (`--project`) tells `tsc` **which config file to use**.

**⚠️ A real trap (verified with TypeScript 7):** in the Vite template, the root `tsconfig.json` has `"files": []` and only `references`. Plain **`tsc --noEmit`** then reads that root config, finds **no files**, checks **nothing**, and **exits 0**, even when there's a type error. The check passes silently. Fix it with **either**:
- `"typecheck": "tsc --noEmit -p tsconfig.app.json"` (point it at the real config), **or**
- `"typecheck": "tsc -b"` (follow the references; those configs already have `noEmit`).

**Related flags:**

| Flag | Meaning |
|---|---|
| `--noEmit` | Check only, no output files |
| `-b` / `--build` | Build mode: follow project references, incremental |
| `-p <file>` / `--project` | Use this tsconfig |
| `--watch` | Re-check on every file change |
| `--incremental` | Cache results in `.tsbuildinfo` for faster re-runs |
| `--pretty false` | Plain output (easier to parse in some CI tools) |

### `"analyze": "vite build --mode analyze"`
- **`--mode analyze`** runs a normal production build, but sets Vite's **mode** to `"analyze"` instead of `"production"`:
  - It loads `.env.analyze` (if it exists).
  - It sets `import.meta.env.MODE` to `'analyze'`, and the config function receives `mode === 'analyze'`.
- **By itself, it changes nothing visible.** You use the mode in `vite.config.js` to turn on a **bundle visualiser** only for this script:

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'analyze' && visualizer({ filename: 'dist/stats.html', open: true, gzipSize: true }),
  ],   // Vite ignores `false` entries, so normal builds don't include the plugin
}))
```

- **Result:** an interactive treemap of **what's inside your bundles and how big each part is**. You'll spot a 300 KB date library or a duplicated dependency immediately. (See **React app optimization techniques → Ship less JavaScript**.)

### `"prepare": "husky"`
- **`prepare` is a special lifecycle script:** npm runs it **automatically after `npm install`** in your project (and before `npm publish` / `npm pack`). You never run it yourself.
- **`husky`** (v9) installs your **git hooks**: it points git's `core.hooksPath` to the `.husky/` folder, so scripts there run on git events.
- **Result:** every developer who clones the repo and runs `npm install` gets the hooks automatically.
- **The hook itself** lives in `.husky/pre-commit` (created with `npx husky init`):

```bash
# .husky/pre-commit: runs before every `git commit`
npx lint-staged
```

- **Turning it off:** set `HUSKY=0` (for example in CI). In production Docker images, install with `npm ci --omit=dev --ignore-scripts`: husky is a devDependency, so it won't be installed there, and `prepare` must not try to run it.

---

## Dependencies explained

### Version ranges

| Written | Allows | Example: `^19.3.0` / `~19.3.0` / `19.3.0` |
|---|---|---|
| `^19.3.0` (caret, the npm default) | **Minor + patch** updates, not major | 19.3.0 ✅, 19.9.2 ✅, 20.0.0 ❌ |
| `~19.3.0` (tilde) | **Patch** updates only | 19.3.5 ✅, 19.4.0 ❌ |
| `19.3.0` (exact) | Only that version | Pin tools with tight coupling (Playwright) |
| `^0.5.20` | **Below 1.0, a caret is stricter:** `0.5.x` only | 0.5.30 ✅, 0.6.0 ❌ |

**The lock file (`package-lock.json`) records the exact installed version of every package**, including sub-dependencies. With **`npm ci`** in CI, every machine installs **exactly** the same tree, whatever the ranges say. Ranges only matter when someone runs `npm install` or `npm update`. Tools like **Renovate** or **Dependabot** then open pull requests for updates, so they're tested before they're merged.

### `dependencies`: code the app runs

| Package | What it's for |
|---|---|
| `react` | The React library: components, hooks, the rendering logic |
| `react-dom` | Renders React into the **browser DOM** (`createRoot`), plus resource hints (`preload`, `preconnect`). Its version must match `react`. |
| `react-router` | Client-side routing: URLs → pages, navigation, route params, loaders |
| `@tanstack/react-query` | **Server-state management:** fetching, caching, deduplicating and refetching API data (`useQuery`, `useMutation`) |
| `zod` | **Runtime validation:** checks API responses, forms and env variables, and infers TypeScript types from schemas |

### `devDependencies`: tools that build, test and check

| Package | What it's for |
|---|---|
| `vite` | Dev server + production bundler |
| `@vitejs/plugin-react` | Vite plugin for React: JSX transform, Fast Refresh (hot reload of components) |
| `typescript` | Provides `tsc`, the type checker (types are removed before the browser sees them) |
| `vitest` | Unit and component test runner |
| `@testing-library/react` | Renders components in tests and queries them like a user (`getByRole`, `getByText`) |
| `@playwright/test` | End-to-end browser tests (pinned exactly, see above) |
| `eslint` | Linter for bugs and bad patterns |
| `prettier` | Code formatter |
| `husky` | Installs git hooks |
| `lint-staged` | Runs checks on **staged** files only (used by the pre-commit hook) |

---

## Dependencies vs devDependencies

**In a browser app (SPA), everything you import ends up bundled into the JavaScript files anyway**, so why separate them?

1. **Clarity:** anyone can see what the app actually uses at runtime.
2. **Faster, smaller installs** where tools aren't needed: `npm ci --omit=dev`.
3. **It matters a lot for server code:** SSR apps (Next.js) and Node servers install only `dependencies` in production Docker images.
4. **Security reviews:** vulnerabilities in runtime dependencies matter more than in dev tools.

**Rule:** if the **browser or server runs it**, it's a `dependency`. If it only **builds, tests or checks** the code, it's a `devDependency`.

---

## lint-staged, browserslist & overrides

### `"lint-staged": { … }`

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,md,json}": ["prettier --write"]
}
```

- **What:** configuration for the `lint-staged` tool, which the husky pre-commit hook runs.
- **"Staged" files** = the files you `git add`ed for this commit. lint-staged runs the commands **only on those files**, so it's fast even in a huge repo.
- **Each key is a glob pattern:** `*.{js,jsx,ts,tsx}` matches files ending in any of those extensions.
- **Each value is a list of commands, run in order,** with the matching file paths appended:
  1. `eslint --fix`: fix what ESLint can fix automatically; **stop the commit** if errors remain.
  2. `prettier --write`: format the files.
- **Changes made by these commands are added to the commit automatically.**
- **Result:** unformatted or broken code **never gets into git**, and CI rarely fails on lint or formatting.

### `"browserslist": ["> 0.5%", "last 2 versions", "not dead"]`

- **What:** a shared list of **which browsers you support**, read by tools like Autoprefixer (CSS vendor prefixes), Lightning CSS, Babel and `@vitejs/plugin-legacy`.
- **The queries:**
  - `> 0.5%`: browsers with more than 0.5% global usage.
  - `last 2 versions`: the last two versions of every browser.
  - `not dead`: exclude browsers without official updates for 24 months.
  - The result is the **union** of the first two, **minus** the dead ones. See the exact list with `npx browserslist`.
- **Vite note:** Vite's **JavaScript** output target is set by `build.target` in `vite.config.js` (by default, browsers in the "Baseline widely available" set), not by browserslist. Keep them consistent.
- **Why it matters:** too old a target means bigger bundles (more transforms and polyfills); too new means a broken site for some customers. Check your analytics.

### `"overrides": { "some-vulnerable-sub-dependency": "^2.1.4" }`

- **What:** forces a specific version of a package **anywhere in the dependency tree**, including **sub-dependencies** you don't install directly.
- **Typical case:** `npm audit` reports a vulnerability in `some-lib`, which comes through `library-a → library-b → some-lib@2.1.0`. The fix is in 2.1.4, but `library-a` hasn't released an update. `overrides` makes npm install the fixed version everywhere.
- **Can be targeted:** `"overrides": { "library-a": { "some-lib": "^2.1.4" } }` changes it only under `library-a`.
- **Other package managers:** yarn uses `resolutions`, pnpm uses `pnpm.overrides`.
- **Remove it** once the upstream libraries update, and **test after adding it**: forcing versions can break libraries that weren't tested with them.

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
import.meta.env.MODE        // 'development' | 'production' | 'analyze' (custom modes)
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
- ✅ **The Node version is pinned:** `engines` / `devEngines` + `.nvmrc`, matching CI and the Docker image.
- ✅ **`packageManager` is set**, so only one lock file type is used.
- ✅ **Scripts exist for build, test, lint, typecheck and format**, and run in CI.
- ✅ **`typecheck` really checks something:** `-p tsconfig.app.json` or `tsc -b` with project references.
- ✅ **Runtime libraries are in `dependencies`** and tools in `devDependencies`.
- ✅ **No unused dependencies** (check with `npx knip` or `npx depcheck`). Each one is extra size and attack surface.
- ✅ **`npm audit` and Dependabot or Renovate** keep packages patched, with `overrides` for urgent sub-dependency fixes.
- ✅ **No secrets in `VITE_` / `REACT_APP_` variables.**
- ✅ **Bundle size is watched:** the `analyze` script, a size budget in CI, and lazy-loaded routes.
- ✅ **Git hooks** (husky + lint-staged) stop broken code being committed, and `--ignore-scripts` is used in production images.
- ✅ **Caret ranges plus a lock file** for apps. Exact pins only where a tool needs them (Playwright) or a library is known to break on minor versions.

**A typical CI pipeline:**

```bash
npm ci                  # exact install from the lock file (HUSKY=0 to skip hooks in CI)
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:e2e        # against the built app (vite preview)
```

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

**Q: What does `tsc --noEmit` do?**
It runs the TypeScript compiler as a **type checker only**: it reports type errors but writes no JavaScript output, because the bundler (Vite) produces the real output. It's used in CI and pre-push checks.

**Q: Why does `build` run `tsc -b && vite build`?**
Vite doesn't type-check; it only strips types. `tsc -b` checks types first (following project references), and `&&` stops the build if that fails, so a build with type errors is never produced.

**Q: Why might `tsc --noEmit` pass even with type errors?**
With a solution-style root `tsconfig.json` (`"files": []` + `references`), it checks no files at all. Use `tsc -b` or `tsc --noEmit -p tsconfig.app.json`.

**Q: `prettier --write` vs `prettier --check`?**
`--write` reformats the files (locally, in hooks); `--check` only reports and fails with exit code 1 if files aren't formatted (in CI).

**Q: `vitest` vs `vitest run`?**
`vitest` starts watch mode in an interactive terminal; `vitest run` runs once and exits with a pass/fail code, for CI.

**Q: What is the `prepare` script?**
A lifecycle script npm runs automatically after `npm install`. Here it runs `husky` to install the git hooks for every developer.

**Q: What does `"private": true` do?**
It prevents the package from being published to the npm registry by accident (`EPRIVATE`).

**Q: `engines` vs `devEngines`?**
`engines` declares the supported Node versions and only warns unless `engine-strict` is set; `devEngines` describes the development environment and can make `npm install` fail with `onFail: "error"`.

**Q: How do you make installs reproducible?**
Commit the lock file, use `npm ci`, and pin the Node version (`engines`/`devEngines`, `.nvmrc`) and the package manager (`packageManager`).

**Q: How do you force a safe version of a vulnerable sub-dependency?**
The `overrides` field (npm), `resolutions` (yarn) or `pnpm.overrides`.

**Q: Are `VITE_` environment variables secret?**
No. They're embedded in the client JavaScript and visible to anyone. Only put public configuration there.

---

## 🎯 Interview answer

> "In a production React app I check that package.json has `private: true` so it can't be published by mistake, a meaningful version that we send to error tracking, and `type: module` so config files use ES modules. Installs are reproducible: a committed lock file with `npm ci` in CI, the Node version pinned with `engines` or the stricter `devEngines` plus `.nvmrc`, and the package manager pinned with `packageManager`. The scripts are the team's single interface. `dev` runs Vite's dev server with HMR. `build` runs `tsc -b && vite build`, because Vite only strips types, so `tsc` type-checks first, following the project references, and `&&` stops a broken build. `preview` serves the production build locally. `test` is `vitest run` for a single CI run, with plain `vitest` for watch mode, and `test:e2e` runs Playwright in real browsers. `lint` runs ESLint on the project. `format` runs Prettier with `--write`, while `format:check` uses `--check` to fail CI without changing files. `typecheck` runs `tsc --noEmit`, which only checks types without writing output, pointed at the app tsconfig so it doesn't silently check nothing in a solution-style setup. `analyze` builds with a custom mode that enables a bundle visualiser, and `prepare` installs husky git hooks that run lint-staged on staged files before each commit. Runtime libraries go in dependencies and tooling in devDependencies, using caret ranges plus the lock file and exact pins for tools like Playwright. I set browserslist for CSS targets, consistent with Vite's build target, use `overrides` for vulnerable transitive dependencies, and never put secrets in `VITE_` variables."
