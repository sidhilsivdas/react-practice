// Make these generic, so the types flow from input to output. No `any`.

// 1. The first item, or undefined for an empty array
function first(items: any[]): any {
  return items[0]
}

// 2. Put a value in an array
function wrap(value: any): any[] {
  return [value]
}

// 3. Combine two OBJECTS: the result has both objects' properties
function merge(a: any, b: any): any {
  return { ...a, ...b }
}

const n = first([1, 2, 3])                     // should be number | undefined
const m = merge({ id: 1 }, { name: 'Ana' })    // m.id: number, m.name: string
console.log(n, wrap('hi'), m)
