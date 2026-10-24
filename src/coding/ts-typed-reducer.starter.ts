type CartItem = { id: number; name: string; price: number; qty: number }
type State = { items: CartItem[] }

// 1. An action is one of:
//    { type: 'add'; item: CartItem }
//    { type: 'remove'; id: number }
//    { type: 'clear' }
type Action = any

// 2. Handle each action and return a NEW state (don't change the old one):
//    'add'    → append the item; if that id is already in the cart, add to its qty instead
//    'remove' → remove the item with that id
//    'clear'  → empty the cart
function cartReducer(state: State, action: Action): State {
  // your code here
  return state
}

// In a component: const [cart, dispatch] = useReducer(cartReducer, { items: [] })
console.log(cartReducer({ items: [] }, { type: 'add', item: { id: 1, name: 'Pen', price: 2, qty: 1 } }))
