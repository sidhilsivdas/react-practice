## Problem

You have a list of roles in an array, and want a `Role` type that **stays in sync** with it: add a role to the array, and the type updates by itself.

1. Make `ROLES` a **readonly tuple of its exact strings** (not `string[]`).
2. Derive `type Role` **from** `ROLES`, so it's `'admin' | 'editor' | 'viewer'`.
3. Make `getLabel` accept only a `Role`, and fix the type error on `LABELS[role]`.

## Examples

```ts
type Role = 'admin' | 'editor' | 'viewer'   // what Role should become (without typing it)

getLabel('admin')    // "Administrator"
getLabel('owner')    // ❌ type error
```

## Hints

1. Hover in your head: `['admin', 'editor']` is inferred as `string[]`. Add **`as const`** to keep the exact values: `readonly ['admin', 'editor', 'viewer']`.
2. `typeof ROLES` turns the **value** into a **type**.
3. `(typeof ROLES)[number]` means "the type of any item in it": the union of all items.
4. Why does `LABELS[role]` fail? A `string` could be any key. Once `role` is a `Role`, it's a known key.

<!-- SOLUTION -->

## Solution

```ts
const ROLES = ['admin', 'editor', 'viewer'] as const
// typeof ROLES = readonly ['admin', 'editor', 'viewer']

type Role = (typeof ROLES)[number]
// = 'admin' | 'editor' | 'viewer'

const LABELS = {
  admin: 'Administrator',
  editor: 'Editor',
  viewer: 'Viewer',
}

function getLabel(role: Role): string {
  return LABELS[role]   // ✅ role is a known key of LABELS
}
```

## What as const does

```ts
const a = ['admin', 'editor']            // string[]
const b = ['admin', 'editor'] as const   // readonly ['admin', 'editor']

const c = { theme: 'dark' }              // { theme: string }
const d = { theme: 'dark' } as const     // { readonly theme: 'dark' }
```

`as const` makes TypeScript infer the **narrowest** type: exact literal values, `readonly`, and tuples instead of arrays.

## Values → types

| You have | You want | Write |
|---|---|---|
| A value `ROLES` | Its type | `typeof ROLES` |
| An array/tuple type | Union of its items | `(typeof ROLES)[number]` |
| An object `LABELS` | Union of its keys | `keyof typeof LABELS` |
| An object `LABELS` | Union of its values | `(typeof LABELS)[keyof typeof LABELS]` |

**Bonus: make sure every role has a label** with `satisfies`:

```ts
const LABELS = {
  admin: 'Administrator',
  editor: 'Editor',
  viewer: 'Viewer',
} satisfies Record<Role, string>   // ❌ error if a role is missing, and keeps the exact keys
```

## Instead of enums

This `as const` + union pattern is often preferred over `enum`: it's plain JavaScript (no extra runtime code), and the values are just strings.

## 🎯 Interview answer

> "`as const` tells TypeScript to infer the narrowest type: literal values, readonly, and tuples. With an array of roles marked `as const`, I can derive the union type with `(typeof ROLES)[number]`, so the type and the runtime list never drift apart. `typeof` turns a value into a type, `keyof typeof obj` gives its keys, and `satisfies Record<Role, string>` checks an object covers every role without widening it. It's a common, lighter alternative to enums."
