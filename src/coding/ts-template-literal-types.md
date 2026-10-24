## Problem

**Template literal types** build string types the way template strings build strings: `` `on${Name}` ``. Combined with **key remapping** in mapped types, they can rename keys. Implement:

1. **`EventHandlerName<E>`**: `'click'` → `'onClick'`. A union should work too: `'click' | 'focus'` → `'onClick' | 'onFocus'`.
2. **`Getters<T>`**: for each property, a getter method named `get` + the capitalized key.
3. **`CssLength`**: a number followed by `'px'`, `'rem'` or `'%'`.

## Examples

```ts
type A = EventHandlerName<'click'>                    // 'onClick'
type B = Getters<{ name: string; age: number }>
// { getName: () => string; getAge: () => number }

const a: CssLength = '10px'      // ✅
const b: CssLength = '1.5rem'    // ✅
const c: CssLength = '10em'      // ❌
const d: CssLength = 'px'        // ❌ no number
```

## Hints

1. TypeScript has built-in string helpers: `Capitalize<S>`, `Uncapitalize<S>`, `Uppercase<S>`, `Lowercase<S>`.
2. A template literal type with a union inside makes **every combination**: `` `${'a' | 'b'}-x` `` is `'a-x' | 'b-x'`.
3. Rename keys with **`as`**: `{ [K in keyof T as NewName]: ... }`.
4. `keyof T` can include `number` and `symbol` keys, but `Capitalize` needs a string: use `K & string`.
5. `` `${number}` `` matches any number written as a string.

<!-- SOLUTION -->

## Solution

```ts
type EventHandlerName<E extends string> = `on${Capitalize<E>}`

type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

type CssLength = `${number}${'px' | 'rem' | '%'}`
```

## Unions spread out

```ts
EventHandlerName<'click' | 'focus'>
= `on${Capitalize<'click' | 'focus'>}`
= 'onClick' | 'onFocus'

type Size = `${'sm' | 'md' | 'lg'}-${'x' | 'y'}`
// 'sm-x' | 'sm-y' | 'md-x' | 'md-y' | 'lg-x' | 'lg-y'
```

Careful: two unions of 50 members make 2,500 combinations. TypeScript caps very large unions.

## Key remapping with as

```ts
{ [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K] }
//                  └─ the NEW key name            └─ the value still uses the OLD key K
```

- Renaming: `` as `get${...}` ``
- **Filtering**: map a key to `never` to drop it: `as T[K] extends Function ? never : K` keeps only non-function properties.

**Why `K & string`?** `keyof T` is `string | number | symbol` in general, and you can't put a symbol inside a template string. `K & string` keeps only the string keys.

## Parsing strings with infer

Template literals also work in **patterns**:

```ts
type RouteParam<S> = S extends `${string}:${infer P}` ? P : never
type P = RouteParam<'/users/:id'>   // 'id'
```

Typed routers (TanStack Router, typed Next.js routes) use this to type URL params from the path string.

## 🎯 Interview answer

> "Template literal types build string literal types with the same syntax as template strings, like `` `on${Capitalize<E>}` ``, and a union inside them expands to every combination. TypeScript has intrinsic helpers like `Capitalize` and `Uppercase`. With key remapping in a mapped type, `[K in keyof T as NewKey]`, I can rename keys, for example generating getter names, or drop keys by mapping them to `never`. I use `K & string` because keys can be numbers or symbols. They can also parse strings with `infer`, which is how typed routers extract URL params."
