// Replace every `any` with a real type.

// 1. A User has: id (number), name (string), email (optional string),
//    and role: only 'admin' or 'member'
type User = any

// 2. greet takes a User and an optional greeting (default 'Hello') and returns a string
function greet(user: any, greeting: any = 'Hello'): any {
  return `${greeting}, ${user.name}!`
}

// Try it
const ana: User = { id: 1, name: 'Ana', role: 'admin' }
console.log(greet(ana))
console.log(greet(ana, 'Hi'))
