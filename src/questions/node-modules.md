## Short answer

**Node has two module systems:**

| | **CommonJS (CJS)** | **ES Modules (ESM)** |
|---|---|---|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | **synchronous**, at runtime | **asynchronous**, analysed before running |
| File types | `.js` (default), `.cjs` | `.mjs`, or `.js` with `"type": "module"` in package.json |
| Top-level `await` | ❌ | ✅ |
| `__dirname`, `__filename` | ✅ | ❌ use `import.meta.dirname` / `import.meta.filename` |
| Tree-shaking by bundlers | harder | ✅ (static imports) |
| Status | the original Node system, still very common | **the JavaScript standard**, recommended for new code |

---

## CommonJS

```js
// math.js
function add(a, b) {
  return a + b
}
module.exports = { add }        // or: exports.add = add

// app.js
const { add } = require('./math')
const fs = require('fs')        // built-in module
const express = require('express')   // from node_modules
console.log(add(2, 3))
```

**`require` can be used anywhere**, even inside `if` statements, because it's just a function call at runtime.

### ⚠️ `exports` vs `module.exports`

```js
exports.add = add                // ✅ adds a property to module.exports
module.exports = { add }         // ✅ replaces the whole export

exports = { add }                // ❌ only reassigns the local variable: nothing is exported!
```

`exports` starts as a **shortcut reference** to `module.exports`. What's actually exported is always `module.exports`.

---

## ES Modules

```js
// math.mjs
export function add(a, b) {
  return a + b
}
export default function multiply(a, b) {
  return a * b
}

// app.mjs
import multiply, { add } from './math.mjs'    // ⚠️ the file extension is required in Node
import fs from 'node:fs'                      // 'node:' prefix = built-in module
import express from 'express'

const config = await loadConfig()             // ✅ top-level await
```

**Enable ESM for `.js` files** in `package.json`:

```json
{
  "type": "module"
}
```

**Dynamic import** (works in both systems, returns a promise):

```js
const { default: chalk } = await import('chalk')
```

### `__dirname` in ESM

```js
// Node 20.11+
const dir = import.meta.dirname
const file = import.meta.filename

// older versions
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
```

---

## Module caching

**A module's code runs only the first time it's loaded.** Later `require`/`import` calls get the **cached** result, the same object:

```js
// counter.js
let count = 0
module.exports = { increment: () => ++count }

// a.js and b.js both require('./counter')
// → they share the SAME count (it behaves like a singleton)
```

**This is why** a database connection created in a module is shared across your app.

### How `require` resolves a path

```
require('fs')            → built-in module
require('./utils')       → ./utils.js, ./utils.json, ./utils/index.js ...
require('express')       → node_modules/express (searches parent folders upward)
```

---

## Mixing the two

| From → importing | Works? |
|---|---|
| **ESM imports CJS** | ✅ `import pkg from 'cjs-package'` (you get `module.exports` as the default) |
| **CJS imports ESM** | ✅ with `await import('esm-package')`. Newer Node versions (22+) can also `require()` ESM files that don't use top-level await. |

**Common error:**

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

The package is ESM-only (many modern packages are). Use `import`, dynamic `import()`, or a newer Node version.

---

## Other differences

| | CJS | ESM |
|---|---|---|
| `this` at the top level | `module.exports` | `undefined` |
| Strict mode | opt-in (`'use strict'`) | **always strict** |
| Exports are | a **copy** of values at require time (for primitives) | **live bindings** (importers see updates) |
| Circular dependencies | may get a **partially filled** object | handled with live bindings (but still messy) |

---

## Quick Q&A

**Q: CommonJS vs ES modules?**
CJS uses `require`/`module.exports`, loads synchronously at runtime, and is Node's original system. ESM uses `import`/`export`, is the JavaScript standard, loads asynchronously with static analysis, supports top-level await, and is enabled with `.mjs` or `"type": "module"`.

**Q: `exports` vs `module.exports`?**
`exports` is a reference to `module.exports`. Adding properties works; reassigning `exports` breaks the link. Only `module.exports` is actually exported.

**Q: Are modules cached?**
Yes. A module runs once, and later imports get the same cached instance, which is why modules behave like singletons.

**Q: How do you get `__dirname` in ESM?**
`import.meta.dirname` (Node 20.11+), or `path.dirname(fileURLToPath(import.meta.url))`.

**Q: What does the `node:` prefix do?**
`import fs from 'node:fs'` makes it explicit that it's a built-in module, never a package from npm.

---

## 🎯 Interview answer

> "Node supports two module systems. CommonJS uses `require` and `module.exports`; it loads synchronously at runtime, so `require` can appear anywhere, and it gives you `__dirname` and `__filename`. ES modules use `import` and `export`, which is the JavaScript standard; they're statically analysed, so bundlers can tree-shake them, they support top-level await, they're always in strict mode, and they export live bindings. You enable ESM with the `.mjs` extension or `"type": "module"` in package.json, and in ESM you use `import.meta.dirname` instead of `__dirname`. Both systems cache modules, so a module's code runs once and every importer shares the same instance. ESM can import CommonJS packages, and CommonJS can load ESM with dynamic `import()`. A common CJS gotcha is reassigning `exports` instead of `module.exports`, which exports nothing."
