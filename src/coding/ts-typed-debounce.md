## Problem

The `debounce` logic already works (see the JavaScript **Implement debounce** problem). Now **type it**, with no `any`:

- The debounced function takes **exactly the same arguments** as `fn`.
- It returns `void` (it runs later, so it can't return `fn`'s result).
- `timerId` gets a real type too.

**Note:** the `search(42)` line is there on purpose. It should turn into a type error. Then delete it.

## Examples

```ts
const search = debounce((query: string, page: number) => fetchResults(query, page), 300)

search('ts', 1)     // ✅
search(42)          // ❌ Argument of type 'number' is not assignable to parameter of type 'string'
search('ts')        // ❌ Expected 2 arguments
```

## Hints

1. Capture **all** the arguments as one type parameter: `<Args extends unknown[]>`.
2. Use it in a rest parameter: `fn: (...args: Args) => void`. TypeScript infers `Args` as a tuple, like `[query: string, page: number]`.
3. The return type is `(...args: Args) => void`.
4. `setTimeout` returns a `number` in browsers but a `Timeout` object in Node. `ReturnType<typeof setTimeout>` works in both.

<!-- SOLUTION -->

## Solution

```ts
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timerId: ReturnType<typeof setTimeout> | undefined

  return (...args: Args) => {
    clearTimeout(timerId)
    timerId = setTimeout(() => fn(...args), delay)
  }
}
```

## Generic rest parameters

```ts
debounce((query: string, page: number) => {}, 300)
// Args = [query: string, page: number]   ← a tuple, even keeping the names
// returns (query: string, page: number) => void
```

`Args extends unknown[]` means "any list of arguments". Putting it in a **rest parameter** makes TypeScript infer it as a tuple of the exact parameter types.

**Alternative with one type parameter for the whole function:**

```ts
function debounce<F extends (...args: never[]) => void>(fn: F, delay: number) {
  let timerId: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<F>) => {
    clearTimeout(timerId)
    timerId = setTimeout(() => fn(...args), delay)
  }
}
```

Both work; `Args` is a bit simpler to read.

## Why void and not ReturnType<F>?

The real call happens **later**, in a `setTimeout`. When you call `search('ts', 1)`, there's no result yet, so the honest return type is `void`. (If you need the result, return a `Promise` that resolves after the delay.)

## The timer type

| Write | Problem |
|---|---|
| `let timerId: number` | Fails in Node, where `setTimeout` returns a `Timeout` object |
| `let timerId: NodeJS.Timeout` | Fails in the browser |
| `ReturnType<typeof setTimeout>` | ✅ whatever `setTimeout` returns in this environment |

## 🎯 Interview answer

> "I type debounce with a generic for the argument list: `<Args extends unknown[]>`, `fn: (...args: Args) => void`, and the returned function is `(...args: Args) => void`. TypeScript infers `Args` as a tuple of the callback's parameter types, so the debounced function accepts exactly the same arguments. It returns void because the original runs later. For the timer I use `ReturnType<typeof setTimeout>`, which works in both browsers and Node."
