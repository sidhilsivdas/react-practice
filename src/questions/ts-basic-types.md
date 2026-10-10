## Quick answer

**The building blocks:**

- **Primitives:** `string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`.
- **Arrays** `number[]`, **tuples** `[string, number]`, **object types** `{ name: string; age?: number }`.
- **Literal types** `'GET' | 'POST'`, and **special types**: `any`, `unknown`, `never`, `void`.

**Let TypeScript infer** where it can (`const n = 5`). **Annotate** function parameters, public APIs and empty values (`useState<User | null>(null)`).

---

## Primitives, arrays, tuples

```ts
let title: string = 'Hello'
let count: number = 42             // integers and decimals are both `number`
let done: boolean = false
let big: bigint = 10n
let id: symbol = Symbol('id')
let nothing: null = null
let notSet: undefined = undefined

const scores: number[] = [90, 85]          // same as Array<number>
const names: readonly string[] = ['a']     // can't push/pop
names.push('b')   // ❌ Property 'push' does not exist on type 'readonly string[]'.

// tuple: fixed length, a type per position (labels are just documentation)
type Range = [start: number, end?: number]
const r: Range = [1]                       // end is optional
const [value, setValue] = useState(0)      // useState returns a tuple
```

---

## Object types

```ts
type User = {
  readonly id: number        // can't be reassigned after creation
  name: string
  email?: string             // optional: string | undefined
  [key: string]: unknown     // index signature: any other string keys allowed
}

const settings: Record<string, boolean> = { darkMode: true }   // dictionary type
```

**Excess property check:** an object **literal** can't have unknown properties, but a **variable** can (structural typing):

```ts
interface Point { x: number; y: number }
const p: Point = { x: 1, y: 2, z: 3 }
// ❌ Object literal may only specify known properties, and 'z' does not exist in type 'Point'.

const raw = { x: 1, y: 2, z: 3 }
const p2: Point = raw        // ✅ OK: not a "fresh" literal
```

---

## Literal types

**A type can be an exact value:**

```ts
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
type Size = 'sm' | 'md' | 'lg'
type Dice = 1 | 2 | 3 | 4 | 5 | 6

function request(url: string, method: Method) {}
request('/api', 'FETCH')   // ❌ Argument of type '"FETCH"' is not assignable to parameter of type 'Method'.
```

**`let` widens, `const` keeps the literal:**

```ts
let a = 'hello'     // type: string        (it can change)
const b = 'hello'   // type: 'hello'       (it can't change)

const config = { method: 'GET' }            // method: string  ← widened
const config2 = { method: 'GET' } as const  // method: 'GET', and readonly
```

---

## any, unknown, never, void

| Type | Meaning | Use it when |
|---|---|---|
| **`any`** | Turns type-checking **off**. Anything goes, and it spreads. | Almost never (migration, quick escape). Prefer `unknown`. |
| **`unknown`** | "Could be anything, **check before use**." | Data from outside: `JSON.parse`, `catch (err)`, API responses before validation |
| **`never`** | A value that **can't exist** | Exhaustive checks, functions that always throw, impossible branches |
| **`void`** | A function returns nothing useful | Return types of callbacks and event handlers |

```ts
let a: any = 'hi'
a.foo.bar()            // ✅ compiles … 💥 crashes at runtime

let u: unknown = 'hi'
u.toUpperCase()        // ❌ 'u' is of type 'unknown'.
if (typeof u === 'string') u.toUpperCase()   // ✅ narrowed first

function fail(msg: string): never {
  throw new Error(msg)            // never returns normally
}

try { /* … */ } catch (err) {     // err is `unknown` in strict mode
  const message = err instanceof Error ? err.message : String(err)
}
```

**Quirk:** a function type returning `void` **accepts** functions that return something. That's why `[1, 2].forEach((n) => arr.push(n))` is fine even though `push` returns a number.

---

## null & undefined

**With `strictNullChecks`** (part of `strict`, default in TypeScript 7), `null` and `undefined` aren't part of other types. You must handle them:

```ts
function len(s: string | null) {
  return s.length          // ❌ 's' is possibly 'null'.
}

function len2(s: string | null) {
  return s?.length ?? 0    // ✅ optional chaining + nullish coalescing
}

const el = document.getElementById('app')    // HTMLElement | null
el!.focus()                // `!` non-null assertion: "trust me". Risky; prefer a real check.
```

---

## Inference vs annotation

**Let TypeScript infer** local variables and return values:

```ts
const total = 10 * 2                        // number
const users = ['a', 'b']                     // string[]
const doubled = [1, 2].map((n) => n * 2)     // n: number (contextual typing), result: number[]
```

**Annotate:**
- **Function parameters** (they can't be inferred).
- **Exported / public functions' return types** (a stable contract, clearer errors).
- **Empty or `null` starting values:** `useState<User | null>(null)`, `const ids: string[] = []`.
- **Object literals that must match a type** (or use `satisfies`).

**Type assertions (`as`) aren't conversions.** They only tell the compiler "trust me":

```ts
const input = document.querySelector('#email') as HTMLInputElement   // OK if you KNOW it's an input
const n = '5' as unknown as number   // compiles, but it's still the string '5' at runtime ⚠️
```

---

## Interview Q&A

**Q: `any` vs `unknown`?**
Both accept any value. `any` disables checking (unsafe, and it spreads); `unknown` forces you to narrow (`typeof`, `instanceof`, a schema) before using it. Prefer `unknown`.

**Q: When is `never` useful?**
Exhaustive `switch` checks (the compiler errors when a new union member isn't handled), functions that always throw, and filtering types in conditional types.

**Q: Tuple vs array?**
An array has any length of one element type; a tuple has a fixed length and a type per position, like `[state, setState]`.

**Q: What does `as const` do?**
It makes the value deeply `readonly` and keeps literal types (`'GET'` instead of `string`, and tuples instead of arrays).

**Q: Type assertion vs type casting?**
TypeScript's `as` doesn't change the value at runtime. It only overrides the compiler's opinion. Real conversion is `Number(x)`, `String(x)`, and so on.

---

## 🎯 Interview answer

> "TypeScript's basic types are the JavaScript primitives, string, number, boolean, bigint, symbol, null and undefined, plus arrays, readonly arrays, tuples with a fixed type per position, and object types with optional, readonly and index-signature properties. Literal types and unions like `'GET' | 'POST'` model exact allowed values; `const` and `as const` keep those literals while `let` widens them. For special types: `any` turns checking off and should be avoided; `unknown` is the safe version, which forces narrowing before use, so I use it for JSON, caught errors and API data; `never` represents impossible values, for exhaustive checks and functions that always throw; and `void` is for functions with no useful return value. With strict null checks I handle null explicitly using optional chaining or narrowing rather than the `!` assertion. I let TypeScript infer locals, annotate parameters, exported return types and empty initial values, and treat `as` as a last resort, because it's an assertion, not a runtime conversion."
