## How to use this page

**Rapid-fire TypeScript interview questions with short, correct answers.** Every concept has its own detailed page in this section, and each page ends with a 🎯 interview answer. Use this page to revise quickly.

---

## Fundamentals

**1. What is TypeScript?**
A typed superset of JavaScript. Types are checked at compile time and then erased, so plain JavaScript runs.

**2. Does TypeScript check types at runtime?**
No. Validate external data (API responses, forms, `JSON.parse`) with a schema library like zod.

**3. What is structural typing?**
Compatibility is based on shape, not names: an object with the right properties fits the type.

**4. `any` vs `unknown` vs `never`?**
`any` disables checking; `unknown` accepts anything but must be narrowed before use; `never` is a value that can't exist (exhaustive checks, functions that always throw).

**5. `void` vs `undefined` as a return type?**
`void` means "ignore the return value", and a `() => void` type accepts functions that return something. `undefined` means it must return `undefined`.

**6. `null` vs `undefined`?**
`undefined` = not assigned (JavaScript's default); `null` = intentionally empty. With `strictNullChecks`, neither is part of other types unless you add it (`string | null`).

**7. What is type inference?**
TypeScript works out types from values and context (`const n = 5` → `5`, `let n = 5` → `number`, callback parameters from the array type).

**8. What does `as const` do?**
It makes a value deeply readonly with literal types, and turns arrays into readonly tuples.

**9. Type assertion (`as`) vs `satisfies` vs annotation?**
`as` overrides the compiler (no real check); an annotation checks and widens to the declared type; `satisfies` checks but keeps the precise inferred type.

**10. What is the non-null assertion `!`?**
It tells the compiler "this isn't null/undefined". It isn't checked at runtime, so prefer a real check or optional chaining.

---

## Types & interfaces

**11. `interface` vs `type`?**
Both describe objects. Interfaces support declaration merging and `extends`; types support unions, tuples, primitives and mapped or conditional types.

**12. What is declaration merging?**
Interfaces with the same name combine. It's used to augment `Window` or library types.

**13. Union vs intersection?**
`A | B` is either one; `A & B` has all properties of both (conflicting properties become `never`).

**14. What is a discriminated union?**
A union where each member has a common literal property (`type: 'add'`). Checking it narrows to one member. Ideal for state and reducer actions.

**15. How do you ensure a switch handles every case?**
Assign the value to `never` in the `default` branch. An unhandled member causes a compile error.

**16. What is narrowing?**
Refining a type through control flow: `typeof`, `instanceof`, `in`, equality, truthiness, `Array.isArray`, type predicates.

**17. Type predicate vs assertion function?**
`(x): x is T` returns a boolean and narrows in `if`; `asserts x is T` throws on failure and narrows after the call.

**18. What is an index signature?**
`{ [key: string]: number }`: an object with arbitrary keys of one type. `Record<string, number>` is equivalent.

**19. What is an excess property check?**
Object **literals** assigned to a type can't have unknown properties. Variables with extra properties are allowed (structural typing).

**20. `readonly` vs `const`?**
`const` stops reassigning a variable; `readonly` stops reassigning a property. Both are shallow, and `readonly` doesn't exist at runtime.

---

## Generics & utility types

**21. Why generics?**
Reusable code that keeps type information and links input to output types, unlike `any`.

**22. What does `T extends U` mean in `<T extends U>`?**
A constraint: `T` must be assignable to `U`.

**23. Write a type-safe property getter.**
`function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key] }`

**24. Name common utility types.**
`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`.

**25. How do you implement `Partial` yourself?**
`type MyPartial<T> = { [K in keyof T]?: T[K] }`

**26. What is `keyof`? `typeof` in a type position?**
`keyof T` = a union of `T`'s keys; `typeof value` = the type of a runtime value.

**27. Turn an array of strings into a union.**
`const roles = ['admin', 'user'] as const; type Role = (typeof roles)[number]`

**28. What is a conditional type?**
`T extends U ? X : Y`, a type-level if/else. It distributes over unions when `T` is a bare type parameter.

**29. What does `infer` do?**
It captures a type inside a conditional type's pattern: `T extends Promise<infer V> ? V : T`.

**30. What are template literal types?**
String types built from other types: `` `on${Capitalize<Event>}` `` → `'onClick' | 'onFocus'`.

---

## Classes, enums, modules

**31. `private` vs `#private`?**
`private` is compile-time only (bracket access still works); `#private` is enforced by JavaScript at runtime.

**32. Abstract class vs interface?**
An abstract class is real code, with shared implementation and abstract members; an interface is a type-only contract.

**33. Why avoid enums?**
They generate runtime code, `const enum` breaks with isolated modules, and Node's type stripping rejects them. Use union literals or an `as const` object.

**34. What are `.d.ts` files?**
Type declarations without implementation: typings for JavaScript libraries, globals and asset imports.

**35. What is `import type`?**
An import used only for types, which is always removed from the output. It's required with `verbatimModuleSyntax`.

---

## React & tooling

**36. How do you type children?**
`children: React.ReactNode`.

**37. How do you extend native element props?**
`type Props = ComponentProps<'button'> & { variant?: 'primary' }`.

**38. How do you type `useState` with null?**
`useState<User | null>(null)`.

**39. How do you type a DOM ref?**
`useRef<HTMLInputElement>(null)`, then `ref.current?.focus()`.

**40. How do you type a form submit handler?**
`(e: SubmitEvent<HTMLFormElement>) => …` (`FormEvent` is deprecated in React 19's types).

**41. How do you type context safely?**
`createContext<Value | null>(null)` plus a `useX()` hook that throws when the value is null.

**42. Does Vite type-check?**
No, it only strips types. Run `tsc --noEmit` in CI.

**43. What does `strict` enable?**
`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, and more. It's the default in TypeScript 7.

**44. What is `noUncheckedIndexedAccess`?**
It adds `| undefined` to indexed access (`arr[i]`, `obj[key]`), because that element might not exist.

**45. `@ts-ignore` vs `@ts-expect-error`?**
Both suppress the next line's error, but `@ts-expect-error` errors when there's no error to suppress, so stale suppressions get removed.

---

## Tricky: will this compile?

```ts
const user = { name: 'Asha', age: 30 }
user.email = 'a@b.c'
```
**❌ No.** `Property 'email' does not exist on type '{ name: string; age: number; }'`. The type is fixed when the object is created.

```ts
let status = 'idle'
const s: 'idle' | 'done' = status
```
**❌ No.** `let` widens to `string`. Use `const`, or annotate `let status: 'idle' | 'done' = 'idle'`.

```ts
function len(s?: string) { return s.length }
```
**❌ No.** `'s' is possibly 'undefined'`. Use `s?.length ?? 0`.

```ts
const handler: () => void = () => 42
```
**✅ Yes.** A `void` return type accepts functions that return values (the result is just ignored).

```ts
type A = { id: string } & { id: number }
const a: A = { id: '1' }
```
**❌ No.** `id` is `string & number` = `never`.

```ts
const nums = [1, 2, 3]
const n: number = nums[10]
```
**✅ Yes by default (it's `undefined` at runtime!).** **❌ With `noUncheckedIndexedAccess`.** That's why the flag exists.

```ts
interface P { x: number }
const raw = { x: 1, y: 2 }
const p: P = raw
```
**✅ Yes.** Excess property checks only apply to fresh object literals.

```ts
const data = JSON.parse('{"a":1}')
data.anything.goes()
```
**✅ Compiles, 💥 crashes.** `JSON.parse` returns `any`. Treat it as `unknown` and validate.

---

## 🎯 Interview answer

> "Asked to summarise TypeScript, I'd say: it's JavaScript with a compile-time structural type system that's erased at runtime, so I validate external data with zod and infer the types from those schemas. Day to day I rely on inference, strict mode and `noUncheckedIndexedAccess`; `unknown` over `any`; discriminated unions with `never` exhaustiveness checks for state and actions; narrowing and type predicates; generics with `keyof` constraints for reusable, type-safe helpers and components; and utility, mapped and conditional types to derive types from one source of truth. In React, that means typed props with `ComponentProps` for native elements, `ReactNode` children, generic `useState` for nullable values, typed refs and events, and context hooks that throw outside their provider. On tooling: Vite doesn't type-check, so CI runs `tsc --noEmit` and type-aware typescript-eslint; I prefer union literals or `as const` objects over enums so code stays erasable for Node's built-in type stripping; and I migrate JavaScript codebases incrementally."
