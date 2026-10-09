// Return a completely independent copy of value: primitives, null,
// and arrays/objects nested to any depth.
function deepClone(value) {
  // your code here

}

const original = { name: 'Sam', address: { city: 'Kochi' }, tags: ['a', 'b'] }
const copy = deepClone(original)
copy.address.city = 'Delhi'
console.log(original.address.city) // should still be "Kochi"
