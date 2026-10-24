import type { ReactNode } from 'react'

// Make List generic: it should work for ANY item type, and renderItem / getKey
// should receive that type (so `u.name` autocompletes and `u.email` is an error).
type ListProps = {
  items: any[]
  renderItem: (item: any) => ReactNode
  getKey: (item: any) => string | number
}

function List({ items, renderItem, getKey }: ListProps) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

type User = { id: number; name: string }
const users: User[] = [{ id: 1, name: 'Ana' }]
const el = <List items={users} getKey={(u) => u.id} renderItem={(u) => u.name} />
