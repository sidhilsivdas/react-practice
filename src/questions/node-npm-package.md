## Short answer

- **`package.json`** describes your project: name, scripts, **dependencies** and their **allowed version ranges**.
- **`package-lock.json`** records the **exact versions** of every installed package (including dependencies of dependencies), so every install gives **the same result**.
- **Semantic versioning:** `MAJOR.MINOR.PATCH`, for example `4.18.2`.

**Analogy: a shopping list** 🛒

- **`package.json`** = "milk, any brand, 1–2 litres" (allowed ranges).
- **`package-lock.json`** = **the receipt**: exactly which brand and size you bought, so next time you buy **exactly the same**.

---

## package.json

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.19.2",
    "pg": "~8.11.3"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "eslint": "^9.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

| Field | Meaning |
|---|---|
| `scripts` | Commands: `npm run dev`, `npm test`, `npm start` |
| `dependencies` | Needed **to run** the app in production |
| `devDependencies` | Needed **only for development**: tests, linters, build tools |
| `peerDependencies` | "The app using me must provide this", e.g. a React component library needs `react` |
| `engines` | Supported Node versions |
| `type` | `"module"` makes `.js` files ES modules |

---

## Semver ranges ⭐

**`MAJOR.MINOR.PATCH`:**

| Part | Bumped when | Example |
|---|---|---|
| **MAJOR** | **Breaking** changes | 4.x → **5**.0.0 |
| **MINOR** | New features, backwards compatible | 4.18 → 4.**19**.0 |
| **PATCH** | Bug fixes only | 4.19.0 → 4.19.**1** |

| Range | Allows | For `1.2.3` |
|---|---|---|
| `^1.2.3` (**caret**, npm's default) | minor + patch updates | `>=1.2.3 <2.0.0` |
| `~1.2.3` (**tilde**) | patch updates only | `>=1.2.3 <1.3.0` |
| `1.2.3` (exact) | only that version | `1.2.3` |
| `*` / `latest` | anything | ⚠️ risky |
| `>=1.2.0 <1.5.0` | a custom range | |

**⚠️ Special case for `0.x`:** `^0.2.3` allows only `>=0.2.3 <0.3.0`, because before 1.0 every minor version may break things.

---

## Lock file

**Without a lock file**, `^4.18.2` could install 4.18.2 today and 4.21.0 next month, so a teammate's machine or the CI server might get **different code**.

**With `package-lock.json`:**

- **Exact versions of the whole dependency tree** are recorded.
- **Everyone installs exactly the same packages.**
- **Commit it to git** (for apps).

### `npm install` vs `npm ci`

| | `npm install` | `npm ci` |
|---|---|---|
| Reads | package.json (and updates the lock file if needed) | **only the lock file** |
| Changes the lock file? | can | **never** (fails if it doesn't match package.json) |
| `node_modules` | updates it | **deletes and reinstalls cleanly** |
| Use for | adding or updating packages during development | **CI/CD and production builds**: reproducible, fast |

---

## Useful commands

```bash
npm install express              # add to dependencies
npm install -D vitest            # add to devDependencies
npm uninstall express
npm outdated                     # which packages have newer versions
npm update                       # update within the allowed ranges
npm audit                        # known security vulnerabilities
npm audit fix                    # apply compatible fixes
npm ls express                   # why is this installed (dependency tree)
npm run <script>                 # run a script from package.json
npx some-cli                     # run a package's CLI without installing it globally
npm ci --omit=dev                # production install, no devDependencies
```

**`npx`** runs a package binary, from `node_modules/.bin` or downloaded temporarily: `npx create-vite@latest`.

---

## Supply-chain security

- **Run `npm audit`** in CI, and use **Dependabot or Renovate** for update pull requests.
- **Commit the lock file and use `npm ci`**, so nothing changes unexpectedly.
- **Be careful with new or unpopular packages**, and typo names (`expresss`).
- **Install scripts** (`postinstall`) can run code on install. Consider `npm ci --ignore-scripts` where possible.
- **Fewer dependencies** means a smaller attack surface.

---

## Quick Q&A

**Q: dependencies vs devDependencies?**
`dependencies` are needed at runtime in production; `devDependencies` only for development and building (tests, linters, bundlers), and can be skipped with `npm ci --omit=dev`.

**Q: `^` vs `~`?**
`^1.2.3` allows minor and patch updates (below 2.0.0); `~1.2.3` allows only patch updates (below 1.3.0).

**Q: Why commit package-lock.json?**
It pins the exact version of every package in the tree, so all developers, CI and production install identical dependencies.

**Q: `npm install` vs `npm ci`?**
`npm ci` installs exactly from the lock file, never modifies it, and does a clean install, so it's ideal for CI and deployments.

**Q: What is npx?**
A tool that runs package binaries without a global install, using local `node_modules/.bin` or downloading temporarily.

**Q: What is semantic versioning?**
MAJOR.MINOR.PATCH: breaking changes bump MAJOR, backwards-compatible features bump MINOR, bug fixes bump PATCH.

---

## 🎯 Interview answer

> "package.json describes the project: its scripts, its runtime dependencies, its devDependencies for tools like test runners and linters, optional peerDependencies, and engines. Versions follow semantic versioning, MAJOR.MINOR.PATCH, where only a major bump should break things. A caret range like `^1.2.3`, npm's default, allows minor and patch updates below 2.0.0, while a tilde `~1.2.3` allows only patch updates, and for 0.x versions the caret is stricter because minors can break. Because ranges can resolve differently over time, package-lock.json records the exact version of every package in the tree, so I commit it and use `npm ci` in CI and production, which installs exactly from the lock file and fails if it's out of sync, while `npm install` is for adding or updating packages. For security I run npm audit, use Dependabot or Renovate, and keep dependencies minimal."
