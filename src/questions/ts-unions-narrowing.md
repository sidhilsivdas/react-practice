## Quick answer

- **Union `A | B`:** the value is **one of** these types.
- **Intersection `A & B`:** the value has **all** properties of both.
- **Narrowing:** TypeScript follows your checks (`typeof`, `in`, `instanceof`, `===`, truthiness) and **knows the exact type inside each branch**.
- **Discriminated union:** each member has a shared literal field (`status: 'success'`). It's the best way to model states, and a `never` check makes the compiler tell you when a case is missing.

---

## Union & intersection

```ts
type ID = string | number

function format(id: ID) {
  id.toUpperCase()      // ❌ Property 'toUpperCase' does not exist on type 'number'.
  // only members that exist on EVERY union member are allowed, until you narrow
}

type Timestamps = { createdAt: Date; updatedAt: Date }
type Post = { title: string } & Timestamps    // must have title, createdAt AND updatedAt
```

---

## Narrowing techniques

```ts
function show(value: string | number | Date | null | string[]) {
  if (value === null) return                          // equality
  if (typeof value === 'string') return value.toUpperCase()   // typeof: string, number, boolean, bigint, symbol, undefined, object, function
  if (typeof value === 'number') return value.toFixed(2)
  if (value instanceof Date) return value.toISOString()       // instanceof: classes
  if (Array.isArray(value)) return value.join(', ')           // arrays
}

type Cat = { meow(): void }
type Dog = { bark(): void }
function speak(pet: Cat | Dog) {
  if ('meow' in pet) pet.meow()     // `in`: checks that a property exists
  else pet.bark()
}

function greet(name?: string) {
  if (name) return `Hi ${name}`     // truthiness: removes undefined (and '' ⚠️)
  return 'Hi guest'
}
```

---

## Discriminated unions

**Model each state with exactly the data it has.** Impossible states become impossible to write:

```ts
// ❌ "bag of optionals": allows nonsense like { loading: true, error: 'x', data: [...] }
type BadState = { loading: boolean; error?: string; data?: User[] }

// ✅ discriminated union: `status` is the discriminant
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: string }

function render(state: State) {
  switch (state.status) {
    case 'idle':    return 'Start'
    case 'loading': return 'Loading…'
    case 'success': return `${state.data.length} users`   // `data` exists only here
    case 'error':   return state.error                    // `error` exists only here
  }
}
```

**Used everywhere:** reducer actions (`{ type: 'add'; item } | { type: 'remove'; id }`), API results (`{ ok: true; data } | { ok: false; error }`), component variants, WebSocket messages.

---

## Exhaustiveness check

**Add a `never` check in the `default` case.** When someone adds a new member to the union and forgets to handle it, the build fails:

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number }   // ← newly added

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2
    case 'square': return s.size ** 2
    default: {
      const unreachable: never = s
      // ❌ Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.
      throw new Error(`Unhandled shape: ${JSON.stringify(unreachable)}`)
    }
  }
}
```

The typescript-eslint rule `switch-exhaustiveness-check` can enforce this too.

---

## Custom type guards

**Type predicate (`x is T`):** a function whose `true` result narrows the type:

```ts
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value
}

if (isUser(data)) data.name    // data: User here

// great with filter: removes null/undefined from the array type
const ids = [1, null, 3].filter((x): x is number => x !== null)   // number[]
// (TypeScript 5.5+ often infers this predicate automatically for simple checks)
```

**Assertion function (`asserts x is T`):** throws when the check fails; after the call, the type is narrowed:

```ts
function assertDefined<T>(value: T, msg = 'Value is missing'): asserts value is NonNullable<T> {
  if (value == null) throw new Error(msg)
}

const root = document.getElementById('root')
assertDefined(root)
root.append('ready')   // root: HTMLElement (no longer null)
```

**A guard is only as good as its code.** A wrong predicate lies to the compiler. For external data, prefer a schema (zod's `safeParse`) over hand-written guards.

---

## Narrowing pitfalls

```ts
// 1. truthiness removes valid values: 0 and '' are falsy
function setVolume(v?: number) {
  if (!v) return               // ⚠️ volume 0 is treated as "missing"
  if (v === undefined) return  // ✅ precise
}

// 2. typeof null === 'object'
function f(x: object | null) {
  if (typeof x === 'object') x  // still `object | null`
}

// 3. narrowing is lost in callbacks if the `let` variable is reassigned later
let user: User | null = getUser()
if (user) {
  setTimeout(() => user.name)   // ❌ 'user' is possibly 'null' (it could change before the callback runs)
}
user = null                     // ← this later assignment is the reason
// without a later reassignment, TypeScript 5.4+ keeps the narrowing inside the callback
// fix: use const, or copy into a const first: const u = user
```

---

## Interview Q&A

**Q: What is narrowing?**
TypeScript's control-flow analysis refines a union to a more specific type inside a branch after checks like `typeof`, `in`, `instanceof`, equality or a type guard.

**Q: What makes a union "discriminated"?**
Every member has a common property with a different literal type (`kind: 'circle'` / `'square'`). Checking it narrows to exactly one member.

**Q: How do you make sure every case is handled?**
Assign the value to a `never` variable in the `default` branch. If a member is unhandled, it isn't `never`, so compilation fails.

**Q: Type predicate vs assertion function?**
A predicate returns a boolean and narrows inside `if`; an assertion function throws on failure and narrows everything after the call.

---

## 🎯 Interview answer

> "A union means a value is one of several types, and an intersection means it has all of their properties. Before using union-specific members you narrow, and TypeScript's control-flow analysis understands `typeof`, `instanceof`, the `in` operator, equality checks, truthiness and `Array.isArray`. My favourite pattern is the discriminated union: each state or action has a literal `status` or `type` field and exactly the data that belongs to it, so impossible states like loading with an error can't be represented. Switching on the discriminant narrows each branch, and a `never` assignment in the default case turns a forgotten case into a compile error when the union grows. For reusable checks I write type predicates, which also work with `filter` to remove nulls, or assertion functions that throw. I watch for pitfalls like truthiness dropping 0 and empty strings, and for external data I prefer schema validation over hand-written guards."
