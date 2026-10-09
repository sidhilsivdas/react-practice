// Turn a nested object into a single level with dot keys.
// Arrays use their index; empty {} / [] are kept as values.
// Example: flattenObject({ a: 1, b: { c: 2 } }) → { a: 1, 'b.c': 2 }
function flattenObject(obj) {
  // your code here

}

console.log(flattenObject({ a: 1, b: { c: 2, d: { e: 3 } } }))
