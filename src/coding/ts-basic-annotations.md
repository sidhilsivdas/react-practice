## Problem

The code works, but everything is typed `any`, so TypeScript can't catch mistakes. **Replace every `any`:**

1. A `User` type with `id` (number), `name` (string), an **optional** `email` (string), and a `role` that can **only** be `'admin'` or `'member'`.
2. Type `greet`'s parameters and its return value. `greeting` is optional and defaults to `'Hello'`.

## Examples

```ts
const ana: User = { id: 1, name: 'Ana', role: 'admin' }   // ✅ email is optional

greet(ana)          // "Hello, Ana!"
greet(ana, 'Hi')    // "Hi, Ana!"

greet(42)                                          // ❌ type error: 42 is not a User
const bad: User = { id: 2, name: 'Bo', role: 'owner' }   // ❌ 'owner' is not a role
```

## How the tests work

**▶ Run tests** checks your code with the real TypeScript compiler (in `strict` mode), then runs it:

| Test | Passes when |
|---|---|
| **types** · Your code has no type errors | The compiler finds no errors in your code |
| **types** · No `any` left | There's no `any` left in your code |
| **types** · `Expect<Equal<A, B>>` | Your type `A` is **exactly** the type `B` |
| **types** · `// @ts-expect-error` | The next line **is** a type error (wrong code must be rejected) |
| **runtime** | The JavaScript (types removed) returns the right value |

`Equal` and `Expect` are added by the tests, so you don't write them.

## Hints

1. An object type: `type User = { id: number; name: string }`.
2. **Optional** property: `email?: string`.
3. A **union of literals** limits a value to a few exact strings: `'admin' | 'member'`.
4. A parameter with a default value is already optional, and TypeScript can infer its type from the default.

<!-- SOLUTION -->

## Solution

```ts
type User = {
  id: number
  name: string
  email?: string               // optional: may be missing
  role: 'admin' | 'member'     // a union of literal types
}

function greet(user: User, greeting: string = 'Hello'): string {
  return `${greeting}, ${user.name}!`
}
```

## Key ideas

| Syntax | Meaning |
|---|---|
| `name: string` | The property must be a string |
| `email?: string` | Optional: `string \| undefined`, and the key can be missing |
| `'admin' \| 'member'` | Only these exact strings: a **literal union** |
| `greeting = 'Hello'` | A default makes the parameter optional: its type is `greeting?: string` |
| `): string` | The return type. TypeScript can infer it, but writing it catches mistakes inside the function |

**`interface` works too:**

```ts
interface User {
  id: number
  name: string
  email?: string
  role: 'admin' | 'member'
}
```

Use `interface` for object shapes you may extend, and `type` for unions and everything else (see the **interface vs type** question).

## Why not `any`?

`any` **switches type-checking off**: `user.nmae` (typo) or `greet(42)` would compile and break at runtime. If you really don't know a type yet, use **`unknown`**, which forces you to check it before using it.

## 🎯 Interview answer

> "I describe object shapes with a `type` or `interface`: required properties, optional ones with `?`, and literal unions like `'admin' | 'member'` for values that can only be a few exact strings. I annotate function parameters, since TypeScript can't infer them, and usually the return type too, so mistakes inside the function are caught. A default value makes a parameter optional and gives its type. I avoid `any` because it turns type-checking off; when the type is truly unknown I use `unknown` and narrow it."
