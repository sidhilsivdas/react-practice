## Quick answer

**TypeScript is JavaScript with static types.**

- You add types (`name: string`), and the **TypeScript compiler checks your code before it runs**: wrong property names, missing arguments, possible `null`, and so on.
- Then the types are **removed** ("type erasure"), and **plain JavaScript** runs in the browser or Node.
- **Types don't exist at runtime.** TypeScript can't validate data from an API by itself (use zod for that).

**Why teams use it:** bugs caught while typing, safe refactoring, great autocomplete, and self-documenting code. That matters most in large codebases and teams.

---

## How it works

```
  app.ts / App.tsx                         app.js
  ┌──────────────────────────────┐        ┌───────────────────────────────┐
  │ function greet(name: string) │  ───▶  │ function greet(name) {        │
  │   return `Hi ${name}`        │ check  │   return `Hi ${name}`         │
  │ }                            │   +    │ }                             │
  │ greet(42)  ❌ error at build  │ strip  │                               │
  └──────────────────────────────┘        └───────────────────────────────┘
```

**Two separate jobs:**

| Job | Who does it |
|---|---|
| **Type-checking** (finding errors) | `tsc` (TypeScript compiler), or your editor in real time |
| **Removing types** (producing JS) | Vite / esbuild / SWC / Babel, which **strip types without checking them**, or `tsc` itself, or Node directly |

**Important for Vite projects:** `vite dev` and `vite build` **don't type-check**. That's why templates run `tsc -b && vite build`, and why you run `tsc --noEmit` in CI.

**Node.js runs `.ts` files directly** (built-in "type stripping", enabled by default in current Node versions):

```bash
node server.ts        # works: types are stripped, no type-checking
```

It only supports **erasable** syntax: types and annotations. `enum`, `namespace` and constructor parameter properties produce:
`SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode`. The `erasableSyntaxOnly` compiler option flags these for you.

---

## Structural typing

**TypeScript compares shapes, not names** ("duck typing"). If it has the right properties, it fits:

```ts
interface Point { x: number; y: number }

function print(p: Point) { console.log(p.x, p.y) }

const pos = { x: 1, y: 2, label: 'A' }
print(pos)         // ✅ OK: pos has x and y (extra properties are fine for a variable)

class Pixel { constructor(public x: number, public y: number) {} }
print(new Pixel(3, 4))   // ✅ OK: never declared "implements Point", but it has the same shape
```

Languages like Java or C# use **nominal** typing (it must be declared as that type). TypeScript doesn't. To get nominal-style types, use **branded types** (see **Advanced types**).

---

## Benefits vs costs

| ✅ Benefits | ⚠️ Costs |
|---|---|
| Catches typos, wrong arguments and `undefined` access **before runtime** | Learning curve (generics, advanced types) |
| **Safe refactoring**: rename a prop and every broken usage is shown | Build and tooling setup, slower CI type-checks on huge projects |
| Autocomplete and inline docs everywhere | Types can lie (`any`, `as`) and give false confidence |
| Code documents itself: function signatures show what's expected | **No runtime safety** for API data, so validate it at the boundaries |
| Easier onboarding in big teams; contracts between packages | Complex types can become hard to read |

**TypeScript 7** (the current version) is a rewrite of the compiler in Go: the "native" `tsc`, with much faster type-checking and editor responsiveness in large codebases. It also turns `strict` mode **on by default** and removes old options like `target: es5` and `baseUrl`.

---

## Type-checking vs runtime validation

**TypeScript trusts what you tell it.** This compiles but can crash:

```ts
type User = { id: number; name: string }

const res = await fetch('/api/user')
const user: User = await res.json()   // res.json() returns `any`, and TS just believes you
user.name.toUpperCase()                // 💥 at runtime if the API sent { id: 1 } without name
```

**Fix: validate at the boundaries** (API responses, forms, `localStorage`, env variables) and derive the type from the schema:

```ts
import { z } from 'zod'

const UserSchema = z.object({ id: z.number(), name: z.string() })
type User = z.infer<typeof UserSchema>          // { id: number; name: string }: one source of truth

const user = UserSchema.parse(await res.json()) // throws if the shape is wrong
```

---

## Interview Q&A

**Q: Does TypeScript make code faster?**
No. Types are removed, and the output is normal JavaScript. It makes **development** safer and faster, not runtime.

**Q: Is TypeScript a different language from JavaScript?**
It's a **superset**: all valid JavaScript is syntactically valid TypeScript, plus type syntax. (With `strict`, some loose JS gets type errors.)

**Q: What's the difference between `tsc` and Vite/esbuild?**
`tsc` type-checks (and can emit JS). esbuild, SWC and Vite only strip types quickly, without checking, so run `tsc --noEmit` separately.

**Q: Can TypeScript check API responses?**
Not at runtime. Use a schema validator like zod or valibot at the boundary and infer the TypeScript type from the schema.

**Q: What is structural typing?**
Types are compatible if their shapes match, regardless of their names or declarations.

---

## 🎯 Interview answer

> "TypeScript is a superset of JavaScript that adds static types. The compiler checks the code before it runs, catching typos, wrong arguments and possible null access, and then the types are erased, so plain JavaScript runs in the browser or Node, with no runtime cost and no runtime checks. Checking and transpiling are separate jobs: Vite, esbuild and SWC just strip types quickly, so we run `tsc --noEmit` in CI, and current Node can even run `.ts` files directly by stripping erasable syntax, which is why I avoid enums and namespaces there. TypeScript uses structural typing, so compatibility is about shape, not declared names. The benefits are safer refactoring, autocomplete, self-documenting APIs and catching bugs early in large teams; the main caveat is that types can't protect against bad data at runtime, so I validate API responses and other boundaries with zod and infer the types from those schemas. TypeScript 7 also brings a much faster native compiler and makes strict mode the default."
