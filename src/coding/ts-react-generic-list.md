## Problem

A `List` component renders any array: you pass `items`, how to render one item (`renderItem`), and how to get its React `key` (`getKey`). With `any`, the callbacks get no type information.

Make `List` **generic**, so the type of `items` flows into the callbacks:

- `items={users}` → `renderItem` and `getKey` receive a `User`
- using a property that doesn't exist (`u.email`) is an error
- `getKey` must return a `string` or `number`

## Examples

```tsx
<List items={users} getKey={(u) => u.id} renderItem={(u) => u.name} />        // u: User
<List items={['a', 'b']} getKey={(s) => s} renderItem={(s) => s.toUpperCase()} />   // s: string

<List items={users} getKey={(u) => u.id} renderItem={(u) => u.email} />        // ❌ no email on User
```

You never write `<List<User> ...>`: TypeScript infers `T` from `items`.

## Hints

1. Make the props type generic: `type ListProps<T> = { items: T[]; ... }`.
2. Make the component generic too: `function List<T>({ ... }: ListProps<T>)`.
3. In `.tsx` files, a generic **arrow function** needs `<T,>` (the comma tells the parser it's not a JSX tag). A `function` declaration doesn't.

<!-- SOLUTION -->

## Solution

```tsx
import type { ReactNode } from 'react'

type ListProps<T> = {
  items: T[]
  renderItem: (item: T) => ReactNode
  getKey: (item: T) => string | number
}

function List<T>({ items, renderItem, getKey }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}
```

**Arrow-function version** (note `<T,>` in a `.tsx` file):

```tsx
const List = <T,>({ items, renderItem, getKey }: ListProps<T>) => ( ... )
```

## How inference works

```tsx
<List items={users} getKey={(u) => u.id} renderItem={(u) => u.name} />
// 1. items={users} → T = User
// 2. getKey and renderItem are typed (item: User) => ...
```

A generic component is just a generic function: JSX props are its arguments, so TypeScript infers `T` from them, exactly like `first([1, 2, 3])`.

## Constraining T

```tsx
// require an id, so getKey isn't needed
function List<T extends { id: string | number }>({ items, renderItem }: { items: T[]; renderItem: (item: T) => ReactNode }) {
  return <ul>{items.map((item) => <li key={item.id}>{renderItem(item)}</li>)}</ul>
}
```

This is why `React.FC` fell out of favour: `const List: React.FC<ListProps<???>>` has nowhere to put the `T`.

## Other generic components

- `Select<T>`: `options: T[]`, `value: T`, `onChange: (value: T) => void`
- `Table<Row>`: `rows: Row[]`, `columns: { key: keyof Row; label: string }[]`
- `Autocomplete<T>`, `DataGrid<T>`... most reusable UI kits are typed this way.

## 🎯 Interview answer

> "A generic component is a generic function whose props use the type parameter, like `function List<T>(props: { items: T[]; renderItem: (item: T) => ReactNode })`. TypeScript infers `T` from the `items` prop, so the callbacks get the exact item type with no annotations, and wrong property access is a compile error. In `.tsx` files a generic arrow function needs `<T,>` so it isn't parsed as JSX. I add constraints like `T extends { id: string | number }` when the component needs certain fields. This is a key reason `React.FC` isn't used anymore: it can't express generic components."
