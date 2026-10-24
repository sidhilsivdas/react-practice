// 1. A Shape is one of:
//    a circle { kind: 'circle', radius }
//    a square { kind: 'square', size }
//    a rect   { kind: 'rect', width, height }
type Shape = any

// 2. Takes a value that should never exist, and throws
function assertNever(value: any): never {
  throw new Error('Unexpected value: ' + value)
}

// 3. Switch on shape.kind. Call assertNever in `default`,
//    so adding a new shape to the union without handling it is a type error
function area(shape: Shape): number {
  // your code here
  return 0
}

console.log(area({ kind: 'square', size: 3 }))
