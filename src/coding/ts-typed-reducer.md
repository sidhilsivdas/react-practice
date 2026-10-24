## Problem

Type a shopping-cart reducer for `useReducer`. The actions are a **discriminated union** on `type`, so each action carries exactly the data it needs.

1. `Action` is one of: `{ type: 'add'; item: CartItem }`, `{ type: 'remove'; id: number }` or `{ type: 'clear' }`.
2. Write `cartReducer(state, action)`. Return a **new** state each time (don't change the old one):
   - **add** → append the item. If an item with that `id` is already in the cart, **add to its `qty`** instead.
   - **remove** → remove the item with that `id`
   - **clear** → empty the cart

## Examples

```ts
cartReducer({ items: [] }, { type: 'add', item: { id: 1, name: 'Pen', price: 2, qty: 1 } })
// { items: [{ id: 1, name: 'Pen', price: 2, qty: 1 }] }

dispatch({ type: 'remove', id: 1 })   // ✅
dispatch({ type: 'remove' })          // ❌ id is missing
dispatch({ type: 'reset' })           // ❌ no such action
```

## Hints

1. `switch (action.type)`: inside `case 'remove':`, `action.id` exists.
2. **Immutable** updates: `[...state.items, item]`, `state.items.filter(...)`, `state.items.map(...)`. Never `push` or `item.qty += 1`.
3. For add: `state.items.some((i) => i.id === action.item.id)` tells you if it's already there.

<!-- SOLUTION -->

## Solution

```ts
type CartItem = { id: number; name: string; price: number; qty: number }
type State = { items: CartItem[] }

type Action =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; id: number }
  | { type: 'clear' }

function cartReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const { item } = action
      const exists = state.items.some((i) => i.id === item.id)
      return {
        items: exists
          ? state.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + item.qty } : i))
          : [...state.items, item],
      }
    }
    case 'remove':
      return { items: state.items.filter((i) => i.id !== action.id) }
    case 'clear':
      return { items: [] }
  }
}
```

**No `default` needed:** the return type is `State`, and TypeScript sees that every member of `Action` returns. If you add a new action type and forget a case, you get *"Function lacks ending return statement"*.

## Using it in a component

```tsx
const [cart, dispatch] = useReducer(cartReducer, { items: [] })
// cart:     State
// dispatch: (action: Action) => void   ← inferred from the reducer

dispatch({ type: 'add', item: pen })   // ✅ autocomplete suggests 'add' | 'remove' | 'clear'
dispatch({ type: 'add' })              // ❌ item is missing
```

You type the **reducer**, and `useReducer` infers everything else.

## Why a union, not one big type?

```ts
// ❌ every field optional: { type: 'remove' } compiles, and action.id might be undefined
type Action = { type: 'add' | 'remove' | 'clear'; item?: CartItem; id?: number }
```

With the union, the payload is **required for exactly the action that needs it**. This is the same pattern Redux Toolkit generates for you.

## 🎯 Interview answer

> "I type reducer actions as a discriminated union on the `type` field, so each action has exactly its own payload. In the reducer, switching on `action.type` narrows the action, so `action.id` is only available in the 'remove' case. I give the reducer an explicit `State` return type, which also makes the switch exhaustive. `useReducer` infers the state and `dispatch` types from the reducer, so invalid actions are caught at the call site. Updates stay immutable with spread, `map` and `filter`."
