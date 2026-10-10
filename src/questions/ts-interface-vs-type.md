## Quick answer

**For object shapes, both work almost the same.** The differences:

- **`interface`** can be **reopened and merged** (declaration merging), uses `extends`, and gives clearer error messages for object hierarchies.
- **`type`** can describe **anything**: unions (`'a' | 'b'`), tuples, primitives, functions, and mapped or conditional types.

**Common rule:** use `type` by default (it covers everything), and `interface` for object contracts that others may extend (library public APIs, classes). **Be consistent in a codebase.** Lint rule: `@typescript-eslint/consistent-type-definitions`.

---

## Same thing, two ways

```ts
interface UserI {
  id: number
  name: string
  greet(): string
}

type UserT = {
  id: number
  name: string
  greet(): string
}

// both: optional, readonly, index signatures, methods, generics
interface Box<T> { value: T }
type Box2<T> = { value: T }
```

---

## Only type can do

```ts
type Status = 'idle' | 'loading' | 'success' | 'error'     // union of literals
type ID = string | number                                    // union of primitives
type Pair = [string, number]                                 // tuple
type Handler = (event: MouseEvent) => void                   // function type (an interface can too, but it's clumsier)
type Keys = keyof User                                       // type operators
type ReadonlyUser = { readonly [K in keyof User]: User[K] }  // mapped type
type ElementOf<T> = T extends (infer E)[] ? E : never        // conditional type
type UserFromSchema = z.infer<typeof UserSchema>             // derived from a value
```

---

## Only interface can do

**1. Declaration merging:** the same name declared twice merges into one:

```ts
interface Window { analytics: Analytics }    // adds to the built-in Window type
window.analytics.track('page_view')           // ✅ now typed

interface Settings { theme: string }
interface Settings { lang: string }           // merged: { theme: string; lang: string }

type T1 = { a: 1 }
type T1 = { b: 2 }   // ❌ Duplicate identifier 'T1'.
```

**Used for:** extending global types (`Window`, `ProcessEnv`), and libraries that let you extend their types (module augmentation):

```ts
// e.g. adding your own theme fields to a library's type
declare module '@mui/material/styles' {
  interface Palette { brand: string }
}
```

**2. `implements` reads naturally with classes** (a `type` of an object shape works too):

```ts
interface Repository<T> { findById(id: string): Promise<T | null> }
class UserRepo implements Repository<User> { async findById(id: string) { return null } }
```

---

## extends vs & (intersection)

```ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }         // interface inheritance

type Animal2 = { name: string }
type Dog2 = Animal2 & { bark(): void }                // intersection: "both at once"
```

**The difference shows on conflicts:**

```ts
interface A { id: string }
interface B extends A { id: number }
// ❌ Interface 'B' incorrectly extends interface 'A'.
//      Types of property 'id' are incompatible.  ← clear error where you declared it

type C = { id: string } & { id: number }
const c: C = { id: 'x' }
// ❌ Type 'string' is not assignable to type 'never'.  ← silently became `never`, error appears later
```

**Performance note:** the TypeScript team has recommended `interface extends` over big intersections because interfaces are cached by name and error messages are simpler. This matters in very large codebases.

---

## Which to use

| Situation | Choose |
|---|---|
| Unions, tuples, functions, mapped or conditional types | **`type`** (the only option) |
| Extending global or library types | **`interface`** (merging) |
| Public object contracts in a library, class `implements` | `interface` (conventional) |
| Component props in React | Either, but be **consistent** (many teams use `type Props = {...}`) |
| Deep object hierarchies | `interface extends` (clearer errors) |

---

## Interview Q&A

**Q: What is declaration merging?**
Declaring an interface with the same name more than once combines the members. It's used to augment `Window` or library types. Types can't merge (`Duplicate identifier`).

**Q: Can a class implement a `type`?**
Yes, if the type is an object shape. It can't implement a union type.

**Q: Can an interface extend a type?**
Yes, if the type is an object shape: `interface Admin extends UserType { role: string }`.

**Q: Why might an intersection become `never`?**
If both sides define the same property with incompatible types (`string & number`), that property becomes `never`, so no value can satisfy it.

---

## 🎯 Interview answer

> "For object shapes, `interface` and `type` are mostly interchangeable: both support optional, readonly and generic members. The differences are that interfaces support declaration merging, which I use to augment globals like `Window` or a library's theme types, and they extend with `extends`, which reports conflicts clearly where they're declared. Type aliases can express anything: unions, tuples, functions, primitives, and mapped or conditional types, and they compose with intersections, where a conflicting property silently becomes `never`. My default is a consistent team convention, typically `type` for props and unions, and `interface` for extendable contracts like library APIs or classes using `implements`, enforced with the typescript-eslint consistency rule."
