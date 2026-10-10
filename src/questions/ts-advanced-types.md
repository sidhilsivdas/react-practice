## Quick answer

**Advanced types let you compute new types from existing ones:**

- **Mapped types:** loop over keys (`{ [K in keyof T]: … }`).
- **Conditional types:** if/else for types (`T extends U ? X : Y`), with **`infer`** to extract parts.
- **Template literal types:** build string types (`` `on${string}` ``).
- **`as const`** and **`satisfies`:** precise literals while still checking against a type.
- **Branded types:** nominal-style IDs, so a `UserId` can't be passed where an `OrderId` is expected.
- **Function overloads:** different return types for different inputs.

---

## Mapped types

**Loop over the keys of a type and transform each property:**

```ts
type User = { id: number; name: string; email?: string }

type Flags<T> = { [K in keyof T]: boolean }
type UserFlags = Flags<User>          // { id: boolean; name: boolean; email?: boolean }

// modifiers: add or remove readonly and ? with + / -
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Concrete<T> = { [K in keyof T]-?: T[K] }      // = Required<T>

// key remapping with `as` (TypeScript 4.1+)
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] }
type UserGetters = Getters<User>      // { getId: () => number; getName: () => string; getEmail?: … }

// filter keys: map unwanted keys to never
type OnlyStrings<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] }
type StringProps = OnlyStrings<{ a: string; b: number; c: string }>   // { a: string; c: string }
```

---

## Conditional types & infer

```ts
type IsString<T> = T extends string ? true : false
type A = IsString<'hi'>     // true
type B = IsString<42>       // false

// infer: "capture" a type from a pattern
type ElementType<T> = T extends (infer E)[] ? E : T
type E1 = ElementType<string[]>    // string

type UnwrapPromise<T> = T extends Promise<infer V> ? V : T
type V1 = UnwrapPromise<Promise<number>>   // number  (the built-in Awaited also handles nesting)

type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never
```

**Distributive behaviour:** with a bare type parameter, a conditional type is applied to **each union member separately**:

```ts
type ToArray<T> = T extends any ? T[] : never
type R1 = ToArray<string | number>         // string[] | number[]   (distributed)

type ToArrayNonDist<T> = [T] extends [any] ? T[] : never
type R2 = ToArrayNonDist<string | number>  // (string | number)[]  (wrapping in [] stops distribution)
```

That's how `Exclude<T, U> = T extends U ? never : T` removes members from a union.

---

## Template literal types

```ts
type EventName = 'click' | 'focus'
type Handler = `on${Capitalize<EventName>}`      // 'onClick' | 'onFocus'

type Color = 'red' | 'blue'
type Shade = 100 | 500
type Token = `${Color}-${Shade}`                // 'red-100' | 'red-500' | 'blue-100' | 'blue-500'

type ApiRoute = `/api/${string}`
const ok: ApiRoute = '/api/users'
const bad: ApiRoute = '/users'                  // ❌ not assignable

// parse with infer: extract route params
type Params<S> = S extends `${string}:${infer P}/${infer Rest}` ? P | Params<`/${Rest}`>
               : S extends `${string}:${infer P}` ? P : never
type P = Params<'/users/:userId/posts/:postId'>  // 'userId' | 'postId'
```

**Real-world use:** typed router params (React Router, TanStack Router), CSS-in-JS tokens, event names, i18n keys.

---

## as const & satisfies

**`as const`:** deeply readonly, with literal types:

```ts
const config = { env: 'prod', retries: 3, regions: ['eu', 'us'] } as const
// { readonly env: 'prod'; readonly retries: 3; readonly regions: readonly ['eu', 'us'] }
```

**`satisfies`** (TypeScript 4.9): **check** the value against a type **without changing** the inferred type:

```ts
type Routes = Record<string, string>

const routesA: Routes = { home: '/', about: '/about' }
routesA.contact.toUpperCase()   // ✅ compiles (any string key is allowed) … 💥 runtime crash

const routesB = { home: '/', about: '/about' } satisfies Routes
routesB.contact                 // ❌ Property 'contact' does not exist on type '{ home: string; about: string; }'.
// still checked: { home: 1 } satisfies Routes would be an error

// keeps literal types when the target type is a literal union
type Theme = Record<string, 'light' | 'dark'>
const themes = { admin: 'dark', guest: 'light' } satisfies Theme
// themes.admin is 'dark', not 'light' | 'dark'

// common combo
const palette = { primary: '#0af', danger: '#f33' } as const satisfies Record<string, `#${string}`>
```

**Rule of thumb:**
- **Annotation (`: Type`):** "this variable **is** this type" (widened to it).
- **`satisfies Type`:** "this value **must fit** the type, but **remember exactly** what it is."
- **`as Type`:** "trust me" (no real check).

---

## Branded types

**Structural typing means that two `string` IDs are interchangeable. That's a source of bugs:**

```ts
function getOrder(orderId: string) {}
const userId = 'u_123'
getOrder(userId)               // ✅ compiles, but it's a bug
```

**Brand them** for nominal-style safety, at zero runtime cost:

```ts
type Brand<T, B extends string> = T & { readonly __brand: B }
type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

const toUserId = (s: string) => s as UserId        // create only through a function (or after validation)

function getOrder(id: OrderId) {}
getOrder(toUserId('u_123'))
// ❌ Argument of type 'UserId' is not assignable to parameter of type 'OrderId'.
getOrder('raw-string')
// ❌ Argument of type 'string' is not assignable to parameter of type 'OrderId'.
```

**Also useful for:** `Email`, `PositiveNumber`, `Cents` vs `Euros`, `SanitizedHtml`. zod supports this with `.brand<'UserId'>()`.

---

## Function overloads

**Different signatures for different inputs.** The implementation signature isn't visible to callers:

```ts
function parse(input: string): number
function parse(input: number): string
function parse(input: string | number) {
  return typeof input === 'string' ? Number(input) : String(input)
}

const a = parse('42')   // number
const b = parse(42)     // string
```

**Often a union or generic is simpler.** Use overloads when the **return type depends on the input type** in a way unions can't express.

**Recursive types:**

```ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
type TreeNode<T> = { value: T; children: TreeNode<T>[] }
```

---

## Interview Q&A

**Q: What is a mapped type?**
A type that iterates over keys (`[K in keyof T]`) to build a new object type. `Partial`, `Readonly`, `Pick` and `Record` are all mapped types.

**Q: What does `infer` do?**
Inside a conditional type, it declares a type variable that TypeScript fills from the matched pattern, for example a Promise's value or a function's return type.

**Q: What are distributive conditional types?**
A conditional type on a naked type parameter is applied to each member of a union separately. Wrap it in `[T]` to prevent that.

**Q: `satisfies` vs type annotation?**
Both check compatibility. An annotation changes the variable's type to the annotated (wider) type; `satisfies` keeps the narrower inferred type, so you keep exact keys and literals.

**Q: How do you stop mixing up IDs of the same primitive type?**
Branded types: intersect the primitive with a unique brand property and create values only through constructor or validation functions.

---

## 🎯 Interview answer

> "Advanced types let me compute types instead of writing them by hand. Mapped types iterate over keys, with modifiers to add or remove `readonly` and optional, and key remapping with `as` to rename or filter properties; that's how utilities like `Partial` and `Pick` are built. Conditional types are type-level if/else; with `infer` they extract parts, such as a Promise's value or a function's return type, and on unions they distribute over each member, which is how `Exclude` works. Template literal types build and parse string types, like event handler names or typed route params. For values, `as const` keeps deep readonly literal types, and `satisfies` checks a value against a type while preserving its precise inferred type, unlike an annotation, which widens it, or `as`, which skips checking. I use branded types to stop mixing up IDs or units that share a primitive type, recursive types for JSON or trees, and overloads only when the return type depends on the input in a way a union or generic can't express."
