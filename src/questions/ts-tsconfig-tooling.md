## Quick answer

- **`tsconfig.json`** controls how TypeScript checks your project. The most important setting is **`strict: true`** (the default in TypeScript 7). Add `noUncheckedIndexedAccess` for extra safety.
- **Type-check separately from building:** Vite and esbuild don't type-check, so run **`tsc --noEmit`** in CI.
- **`.d.ts` files** describe types for JavaScript code. **`@types/*`** packages provide them for libraries without built-in types.
- **Migrate JavaScript gradually** with `allowJs` and `checkJs`, one file at a time.

---

## A modern tsconfig

**For a Vite + React app** (similar to what `npm create vite` generates):

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2023", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",          // how imports are resolved: like Vite/webpack do
    "jsx": "react-jsx",                     // new JSX transform: no `import React` needed
    "noEmit": true,                         // Vite builds; tsc only checks

    "strict": true,                         // ← the most important line
    "noUncheckedIndexedAccess": true,       // arr[i] and obj[key] may be undefined
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,

    "isolatedModules": true,                // every file can be transpiled alone (esbuild/SWC)
    "verbatimModuleSyntax": true,           // forces `import type` for type-only imports
    "skipLibCheck": true,                   // don't type-check node_modules .d.ts files (faster)

    "paths": { "@/*": ["./src/*"] }         // import from '@/components/Button' (configure Vite too)
  },
  "include": ["src"]
}
```

**For a Node.js project:** use `"module": "nodenext"` (and `"moduleResolution": "nodenext"`), `"lib": ["es2023"]`, `"types": ["node"]`. That's what `tsc --init` in TypeScript 7 starts with.

---

## What strict turns on

| Flag | Catches |
|---|---|
| `strictNullChecks` | Using a value that may be `null` / `undefined` (the biggest one) |
| `noImplicitAny` | Parameters with no type, silently becoming `any` |
| `strictFunctionTypes` | Unsafe function parameter types in callbacks |
| `strictPropertyInitialization` | Class fields that are never assigned |
| `useUnknownInCatchVariables` | `catch (err)`: `err` is `unknown`, not `any` |
| `strictBindCallApply`, `alwaysStrict`, `noImplicitThis` | Smaller safety checks |

**Extra flags worth knowing:**

```ts
// noUncheckedIndexedAccess
const arr = [1, 2]
const first: number = arr[5]
// ❌ Type 'number | undefined' is not assignable to type 'number'.  (it really would be undefined!)

// exactOptionalPropertyTypes: `email?: string` no longer accepts an explicit `undefined`
```

**TypeScript 7 changes:**
- `strict` is **on by default**.
- **Old options were removed:** `target: es5`, `moduleResolution: node10`, `baseUrl`, AMD/UMD/System modules, `outFile` and `esModuleInterop: false`. Using them gives errors like `error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.`
- `paths` works without `baseUrl` (paths are relative to the tsconfig).

---

## Type-checking in the build

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  }
}
```

**CI pipeline:** `typecheck` → `lint` → `test` → `build`. **Type errors fail the pipeline**, even though Vite alone would happily build.

**Linting: typescript-eslint** with type-aware rules catches what the compiler allows:
- `no-floating-promises`: forgotten `await`.
- `no-misused-promises`: an async function passed where a void callback is expected.
- `switch-exhaustiveness-check`.
- `no-explicit-any`, `consistent-type-imports`.

**Monorepos:** **project references** (`"references": [...]` + `composite: true`) and `tsc -b` build packages incrementally (see **Structuring a React monorepo**).

---

## Declaration files & @types

**A `.d.ts` file contains only types: no code.** It describes JavaScript that exists elsewhere.

```ts
// types for a library without types: src/types/legacy-lib.d.ts
declare module 'legacy-lib' {
  export function slugify(text: string): string
}

// non-code imports
declare module '*.svg' {
  const src: string
  export default src
}

// global variables injected by a script tag
declare global {
  interface Window { dataLayer: unknown[] }
}
export {}   // makes the file a module, so `declare global` works
```

**Where types come from:**

| Source | Example |
|---|---|
| Built into the package (a `types` field in `package.json`) | zod, axios, TanStack Query, Redux Toolkit |
| **DefinitelyTyped `@types/*`** packages | `@types/react`, `@types/node`, `@types/express` |
| Your own `.d.ts` | Untyped or internal libraries |

**Module augmentation:** add fields to a library's types. A classic Express example:

```ts
// src/types/express.d.ts
import 'express'
declare global {
  namespace Express {
    interface Request { user?: { id: string; role: 'admin' | 'user' } }   // req.user is now typed
  }
}
```

**Type-only imports** are removed completely from the output:

```ts
import type { User } from './types'          // required style with verbatimModuleSyntax
import { api, type ApiError } from './api'   // mixed
```

---

## TypeScript in Node.js

```ts
// server.ts: Express with types
import express, { type Request, type Response } from 'express'
import { z } from 'zod'

const app = express()
app.use(express.json())

const CreateUser = z.object({ name: z.string().min(2), email: z.string().email() })

app.post('/users', (req: Request, res: Response) => {
  const parsed = CreateUser.safeParse(req.body)                 // req.body is `any`: validate it!
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const user = parsed.data                                      // { name: string; email: string }
  res.status(201).json(user)
})
```

**How to run TypeScript in Node:**

| Option | Notes |
|---|---|
| **`node server.ts`** (built-in type stripping) | No build step. Erasable syntax only (no `enum`, `namespace`, parameter properties). Use **relative imports with `.ts` extensions**. Set `erasableSyntaxOnly` + `allowImportingTsExtensions` in tsconfig. |
| **`tsx`** / `ts-node` | Run any TypeScript in development |
| **`tsc`** → `dist/*.js` → `node dist/server.js` | The classic production build, with emitted `.d.ts` for libraries |
| **esbuild / tsup / SWC** | Fast bundling for services and libraries |

**Type-checking is still separate:** run `tsc --noEmit` in CI.

---

## Migrating JS to TS

1. **Add `tsconfig.json`** with `allowJs: true` (and optionally `checkJs: true` to find errors in `.js` files using JSDoc).
2. **Rename files one at a time** (`.js` → `.ts`, `.jsx` → `.tsx`), starting with **leaf modules** (utils, API clients, types), then components.
3. Start **less strict** if needed, then turn on `strict` (or `strictNullChecks` first) and fix errors folder by folder.
4. **Type the boundaries first:** API responses (zod schemas), shared models, props of widely used components.
5. **Ban new `any`** with a lint rule; track the remaining `any` and `@ts-expect-error` count.
6. **Use `@ts-expect-error` over `@ts-ignore`:** it fails when the error disappears, so stale suppressions get cleaned up.

---

## Interview Q&A

**Q: What does `strict` do?**
It enables a family of checks, most importantly strict null checks and no implicit any. Every new project should use it (and TypeScript 7 enables it by default).

**Q: Why doesn't Vite show type errors in the build?**
Vite uses esbuild/Rolldown transforms that strip types per file without checking. Run `tsc --noEmit` (or `tsc -b`) separately.

**Q: What is a `.d.ts` file?**
A declaration file: types only, no implementation. It describes the shape of JavaScript code for TypeScript (library typings, globals, asset modules).

**Q: What is `isolatedModules`?**
It ensures each file can be transpiled on its own, as required by esbuild, SWC and Babel. It flags features that need whole-program information, like re-exporting types without `export type`, or `const enum` across files.

**Q: How would you migrate a large JS codebase?**
Incrementally: `allowJs`, convert leaf modules first, type the boundaries with schemas, increase strictness gradually, block new `any` with linting, and track progress.

---

## 🎯 Interview answer

> "I start every project with `strict` on, which TypeScript 7 now does by default, plus `noUncheckedIndexedAccess` so indexed access includes undefined. For a Vite app I use bundler module resolution, `noEmit`, `isolatedModules` and `verbatimModuleSyntax` so type-only imports are explicit; for Node I use `nodenext`. Because Vite and esbuild only strip types, CI runs `tsc --noEmit` or `tsc -b` with project references in a monorepo, plus typescript-eslint's type-aware rules like `no-floating-promises`. I understand declaration files and `@types` packages, write `.d.ts` modules for untyped libraries and assets, and use module augmentation, for example to add `user` to Express's `Request`. In Node I validate `req.body` with zod, since it's `any`, and either run TypeScript directly with Node's type stripping using erasable syntax only, or compile with tsc or tsup. For migrations I go incrementally with `allowJs`, convert leaf modules first, type the boundaries, tighten strictness step by step, ban new `any`, and prefer `@ts-expect-error` over `@ts-ignore`."
